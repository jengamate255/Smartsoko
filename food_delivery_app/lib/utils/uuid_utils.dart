// Helpers for the Supabase schema's `uuid` columns.
//
// Parts of the app still carry Firebase uid strings (and demo sessions have no
// id at all). PostgREST rejects those with `22P02 invalid input syntax for
// type uuid`, so values are checked here before they are sent to a uuid column.

final RegExp _uuidPattern = RegExp(
  r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-'
  r'[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
);

/// True when [value] has the canonical 8-4-4-4-12 uuid shape.
bool isUuid(String? value) => value != null && _uuidPattern.hasMatch(value);
