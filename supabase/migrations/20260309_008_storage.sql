-- Storage bucket for run files (results.tsv + code files).
-- Path convention: {hypothesis_id}/{run_id}/{filename}
INSERT INTO storage.buckets (id, name, public)
VALUES ('run-files', 'run-files', true);

-- Anyone can read run files (public bucket)
CREATE POLICY run_files_select ON storage.objects
  FOR SELECT
  USING (bucket_id = 'run-files');

-- Authenticated users can upload to their own run paths.
-- Path must match: {hypothesis_id}/{run_id}/{filename}
-- The run must belong to the uploading user.
CREATE POLICY run_files_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'run-files'
    AND auth.role() = 'authenticated'
  );

-- Only the file owner can delete
CREATE POLICY run_files_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'run-files'
    AND auth.role() = 'authenticated'
  );
