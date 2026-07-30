-- MoliVerse knowledge-base migration.
-- Run once in Supabase → SQL Editor (idempotent).
--
-- Courseware used to be stored as a filename and a URL, so the words inside a
-- teacher's PDFs never reached the model — lessons were generated from the
-- course title alone. The uploader now extracts text in the browser and keeps
-- it here, next to the file it came from.

alter table public.course_files add column if not exists text text not null default '';

-- Lets a student's mentor question pull just the extracted text for one
-- course without dragging every file row along with it.
create index if not exists course_files_course_id_idx
  on public.course_files (course_id);
