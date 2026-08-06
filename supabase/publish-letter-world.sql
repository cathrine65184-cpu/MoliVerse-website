-- Publish Catherine's original Letter World collection.
-- The fixed id connects this public record to the hand-authored theatre
-- journey bundled in lib/generatedLessons.ts.

insert into public.courses (id, teacher_id, title, description, language)
values (
  'f15af2ba-b75e-4440-9a63-b5514d031aa9',
  '67bb132f-a70a-4bfb-8f08-9ec6fdd00349',
  'Letter World: Love in Letters',
  'A five-part original English story journey with Catherine. Read a gentle story, learn warm ways to express feelings, then write a kind letter of your own.',
  'English'
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  language = excluded.language;

delete from public.course_files
where course_id = 'f15af2ba-b75e-4440-9a63-b5514d031aa9'
  and name = 'Letter World · Catherine educator guide';

insert into public.course_files (course_id, kind, name, url, text)
values (
  'f15af2ba-b75e-4440-9a63-b5514d031aa9',
  'doc',
  'Letter World · Catherine educator guide',
  'https://moliverse.tech/courseware/letter-world-catherine.md',
  $guide$
Letter World: Love in Letters
Original MoliVerse English course collection by Catherine, ages 6–12.

Guiding line: One day, you will understand love a little more.

Purpose: help children read a gentle original story, learn language for feelings, and write one short kind letter. Expression comes before perfect spelling. Children may use English, Chinese, a mix, drawings, or a voice note.

Original setting: In Letter World, young letter keeper Elia works at the Letter House after a long season of silence. She learns that a parent’s reminder, a friend’s welcome, a thank-you, an apology and a hopeful wish can each carry care. This is original MoliVerse curriculum, not affiliated with any external film, animation or book franchise.

Part 1 — A quiet farewell
Language: farewell; I feel sad / confused / empty.
Question: When you hear a word you do not understand, what might you feel inside?

Part 2 — A new beginning
Language: Dear [Name],; How are you?; a letter; a pen; gentle.
Question: What words are sometimes easier to write than to say aloud?

Part 3 — Other people’s hearts
Language: I remember when …; Thank you for …; I feel warm; I miss you.
Question: What small thing has someone done that made you feel cared for?

Part 4 — A poem for everyone
Language: With love,; You matter.; I hope you …; kind; grateful.
Question: Love is … ? You can finish the sentence in your own way.

Part 5 — Your letter
Template:
Dear [Name],
I remember when [one small thing].
I felt [warm / happy / grateful].
I hope you [wish].
With love,
[Your name]

Mentor voice: Be warm, slow and concrete. Do not grade a child’s feelings. Invite them to choose a safe recipient: family, friend, pet, tree or future self. Never require public sharing.

Human moment: If a child says “Nobody loves me”, “I do not know love”, “I am scared”, or shares another heavy feeling, thank them for telling you. Say they deserve care and do not need to solve it alone. Invite them to tell a trusted grown-up nearby now. Do not pressure for details, promise secrecy or promise that Catherine will contact them.
Suggested response: “I’m really glad you told me. That sounds heavy to carry alone. You deserve care. Can you tell a trusted grown-up near you today? We can pause the letter for now.”
$guide$
);
