import { supabase, type CourseCollection, type CourseLessonContent, type CollectionLesson } from "./supabase";
import { activeExplorerId } from "./family";

export type CollectionProgress = {
  completedCourseIds: string[];
  nextPosition: number;
};

export async function getCollectionProgress(collectionId: string): Promise<CollectionProgress | null> {
  const explorerId = activeExplorerId();
  if (!explorerId) return null;
  const { data } = await supabase.functions.invoke("collection-progress", {
    body: { action: "get", explorerId, collectionId },
  });
  const result = data as { completedCourseIds?: string[]; nextPosition?: number } | null;
  if (!result) return null;
  return { completedCourseIds: result.completedCourseIds ?? [], nextPosition: result.nextPosition ?? 1 };
}

export async function completeCollectionLesson(collectionId: string, courseId: string): Promise<CollectionProgress | null> {
  const explorerId = activeExplorerId();
  if (!explorerId) return null;
  const { data } = await supabase.functions.invoke("collection-progress", {
    body: { action: "complete", explorerId, collectionId, courseId },
  });
  const result = data as { completedCourseIds?: string[]; nextPosition?: number } | null;
  if (!result) return null;
  return { completedCourseIds: result.completedCourseIds ?? [], nextPosition: result.nextPosition ?? 1 };
}

export async function loadCollection(id: string) {
  const { data } = await supabase
    .from("course_collections")
    .select("*, profiles!course_collections_teacher_id_fkey(*), collection_lessons(*, courses(*, profiles!courses_teacher_id_fkey(*)))")
    .eq("id", id)
    .maybeSingle();
  const collection = data as CourseCollection | null;
  if (collection?.collection_lessons) {
    collection.collection_lessons.sort((a, b) => a.position - b.position);
  }
  return collection;
}

export async function loadLessonCollection(courseId: string): Promise<{ link: CollectionLesson; collection: CourseCollection; content: CourseLessonContent | null } | null> {
  const { data: link } = await supabase
    .from("collection_lessons")
    .select("*, course_collections(*)")
    .eq("course_id", courseId)
    .maybeSingle();
  if (!link?.course_collections) return null;
  const { data: content } = await supabase
    .from("course_lesson_content")
    .select("*")
    .eq("course_id", courseId)
    .maybeSingle();
  return {
    link: link as CollectionLesson,
    collection: link.course_collections as CourseCollection,
    content: (content as CourseLessonContent | null) ?? null,
  };
}
