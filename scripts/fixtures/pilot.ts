// Historical sample used only by regression tests; never registered in the site.
import record from './lantern-seed.json';
import {storyToLibraryContent, type StoryRecord} from '../../lib/stories/adapter';
import type {LibraryContent} from '../../lib/contentLibrary';
export const pilotFixture: LibraryContent = {
    ...storyToLibraryContent(record as unknown as StoryRecord),
    games: [{
      id: 'my-seed-sentences', type: 'sentence-card', title: 'Make my own sentences', intro: 'Pick story words to finish new sentences. There is no wrong answer!',
      frames: [
        { id: 'f1', text: 'Moli found a tiny ___ beside the quiet ___.', blanks: [{ options: ['seed', 'leaf', 'path'] }, { options: ['path', 'garden', 'moon'] }] },
        { id: 'f2', text: 'The ___ began to glow in the ___.', blanks: [{ options: ['seed', 'leaf', 'path'] }, { options: ['garden', 'moon', 'morning'] }] },
        { id: 'f3', text: 'Moli ___ the shining path home.', blanks: [{ options: ['followed', 'returned', 'carried'] }] },
      ],
    }],
  };
