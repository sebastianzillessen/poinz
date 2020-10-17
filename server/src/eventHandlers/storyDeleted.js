import {removeById} from './roomModifiers';

/**
 * Removes matching story from "stories" list in room
 */
const storyDeletedEventHandler = (room, eventPayload) => {
  return {
    ...room,
    stories: removeById(room.stories, eventPayload.storyId)
  };
};

export default storyDeletedEventHandler;
