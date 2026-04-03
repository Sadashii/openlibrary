import json
import logging
from collections import defaultdict

import web

from infogami.utils import delegate
from infogami.utils.view import require_login
from openlibrary import accounts
from openlibrary.core import db as ol_db
from openlibrary.core.bookshelves import Bookshelves
from openlibrary.core.models import Edition
from openlibrary.utils.isbn import canonical

logger = logging.getLogger("openlibrary.dataimporter")

_DEFAULT_SHELVES = {
    'to_read': 1,
    'currently_reading': 2,
    'read': 3,
}

def _normalize_shelf(name: str) -> str:
    return name.strip().lower().translate(str.maketrans(' -', '__'))

def _capitalize_shelf(name: str) -> str:
    return name.replace('_', ' ').title()

def _validate_payload(raw_data):
    """Validates the incoming JSON payload from the request."""
    if not raw_data:
        return None, delegate.RawText(
            json.dumps({"error": "missing_body"}),
            status="400 Bad Request",
            content_type="application/json"
        )
    try:
        data = json.loads(raw_data)
    except json.JSONDecodeError:
        return None, delegate.RawText(
            json.dumps({"error": "invalid_json"}),
            status="400 Bad Request",
            content_type="application/json"
        )

    books = data.get("books")
    if not isinstance(books, list):
        return None, delegate.RawText(
            json.dumps({"error": "books_must_be_list"}),
            status="400 Bad Request",
            content_type="application/json"
        )

    return books, None

def _resolve_isbn(raw_isbn, isbn_cache):
    """Attempts to resolve a single raw ISBN to an Edition object."""
    try:
        isbn_canon = canonical(raw_isbn)
        isbn_val, asin = Edition.get_isbn_or_asin(isbn_canon)

        if Edition.is_valid_identifier(isbn_val, asin):
            forms = Edition.get_identifier_forms(isbn_val, asin)
            edition = next(
                (isbn_cache[f] for f in forms if f in isbn_cache),
                None,
            )

            if not edition:
                edition = Edition.from_isbn(isbn_canon)
                if edition:
                    for f in forms:
                        isbn_cache[f] = edition
            return edition
    except Exception as e:
        logger.error(f"Error resolving ISBN {raw_isbn}: {e}")
    return None

def _get_edition_for_book(raw_isbn13, raw_isbn, isbn_cache):
    """Coordinates the ISBN resolution, preferring ISBN13."""
    edition = None
    if raw_isbn13:
        edition = _resolve_isbn(raw_isbn13, isbn_cache)
    if not edition and raw_isbn:
        edition = _resolve_isbn(raw_isbn, isbn_cache)
    return edition

def _process_book_shelves(book, user, username, work_id, work_key, edition_id,
                          existing_shelf_set, custom_list_map, list_keys_cache,
                          db_inserts, pending_seeds, lists_to_save):
    """Handles mapping a book's shelves to DB inserts or custom list seeds."""
    shelves = {_normalize_shelf(s) for s in book.get('shelves', [])}

    for norm_shelf in shelves:
        # 1. Create missing custom lists
        if norm_shelf not in _DEFAULT_SHELVES and norm_shelf not in custom_list_map:
            new_list = user.new_list(
                _capitalize_shelf(norm_shelf),
                "Imported from Goodreads",
                seeds=[],
            )
            custom_list_map[norm_shelf] = new_list
            lists_to_save.add(norm_shelf)

        # 2. Add to default reading log shelves
        if norm_shelf in _DEFAULT_SHELVES:
            shelf_id = int(_DEFAULT_SHELVES[norm_shelf])

            if (work_id, shelf_id) in existing_shelf_set:
                continue

            db_inserts.append({
                'username': username,
                'bookshelf_id': shelf_id,
                'work_id': work_id,
                'edition_id': edition_id,
            })
            existing_shelf_set.add((work_id, shelf_id))

        # 3. Add to custom lists
        elif norm_shelf in custom_list_map:
            target_list = custom_list_map[norm_shelf]

            if norm_shelf not in list_keys_cache:
                current_seeds = getattr(target_list, 'seeds', []) or []
                list_keys_cache[norm_shelf] = {
                    s.get('key') if isinstance(s, dict) else s
                    for s in current_seeds
                }

            if work_key in list_keys_cache[norm_shelf]:
                continue

            pending_seeds[norm_shelf].append({"key": work_key})
            lists_to_save.add(norm_shelf)
            list_keys_cache[norm_shelf].add(work_key)


class process_imports(delegate.page):
    path = "/account/import/process/goodreads"

    @require_login
    def POST(self):
        raw = web.data()

        books, error_response = _validate_payload(raw)
        if error_response:
            return error_response

        try:
            user = accounts.get_current_user()
            username = user.key.split('/')[-1]
            oldb = ol_db.get_db()

            # Pre-fetch existing user data
            existing_entries = oldb.query(
                "SELECT work_id, bookshelf_id FROM bookshelves_books WHERE username=$username",
                vars={'username': username},
            )
            existing_shelf_set = {
                (str(e.work_id), int(e.bookshelf_id)) for e in existing_entries
            }

            existing_lists = user.get_lists(limit=None)
            custom_list_map = {
                _normalize_shelf(lst.name): lst
                for lst in existing_lists
                if hasattr(lst, 'name') and lst.name
            }

            # Initialization for processing loop
            isbn_cache = {}
            list_keys_cache = {}
            lists_to_save = set()
            pending_seeds = defaultdict(list)
            db_inserts = []
            results = []

            # Main processing loop
            for book in books:
                if not isinstance(book, dict):
                    results.append({
                        "row_id": None,
                        "status": "error",
                        "reason": "Invalid book format payload. Expected a dictionary object."
                    })
                    continue

                row_id = book.get('row_id')
                raw_isbn = str(book.get('isbn', '')).replace('="', '').replace('"', '').strip()
                raw_isbn13 = str(book.get('isbn13', '')).replace('="', '').replace('"', '').strip()

                if not raw_isbn and not raw_isbn13:
                    results.append({"row_id": row_id, "status": "error", "reason": "No valid ISBN provided"})
                    continue

                try:
                    edition = _get_edition_for_book(raw_isbn13, raw_isbn, isbn_cache)

                    if not edition or not getattr(edition, 'works', None):
                        results.append({"row_id": row_id, "status": "error", "reason": "Book not found in Open Library"})
                        continue

                    work_key = (
                        edition.works[0]['key']
                        if isinstance(edition.works[0], dict)
                        else getattr(edition.works[0], 'key', None)
                    )

                    if not work_key:
                        results.append({"row_id": row_id, "status": "error", "reason": "Missing Work mapping"})
                        continue

                    work_id = str(work_key.split('/')[-1][2:-1])
                    edition_id = str(edition.key.split('/')[-1][2:-1])

                    # Delegate shelf processing to helper
                    _process_book_shelves(
                        book, user, username, work_id, work_key, edition_id,
                        existing_shelf_set, custom_list_map, list_keys_cache,
                        db_inserts, pending_seeds, lists_to_save
                    )

                    results.append({"row_id": row_id, "status": "success"})

                except Exception as e:
                    logger.error(
                        f"Error processing book with Row ID {row_id}: {e}",
                        exc_info=True,
                    )
                    results.append({"row_id": row_id, "status": "error", "reason": "Internal server error"})

            # Post-processing: Save to Database and Lists
            if db_inserts:
                # Assuming Bookshelves.TABLENAME is accessible contextually
                oldb.multiple_insert(Bookshelves.TABLENAME, db_inserts)

            for list_name in lists_to_save:
                target_list = custom_list_map[list_name]
                if list_name in pending_seeds:
                    target_list.seeds = (
                        list(getattr(target_list, 'seeds', []) or [])
                        + pending_seeds[list_name]
                    )
                target_list._save(comment="Added books via Goodreads import")

            return delegate.RawText(json.dumps({"results": results}), content_type="application/json")

        except Exception as e:
            logger.error(f"Error in process_imports: {e}", exc_info=True)
            raise web.HTTPError(
                "500 Internal Server Error",
                headers={"Content-Type": "application/json"},
            )


def setup():
    pass
