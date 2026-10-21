-- Reference query for the Google source schema, not executed by this import.
-- This project downloads checksum-bound mirrors instead of querying BigQuery.
SELECT DISTINCT origin, experimental.popularity.rank AS rank
FROM `chrome-ux-report.all.202609`
WHERE experimental.popularity.rank <= 5000;
