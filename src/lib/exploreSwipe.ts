import type { DisplayCourt } from "./court-types";
import type { EventWithMetadata } from "./queries/events";

export type ExploreMode = "map" | "swipe";
export type SwipeTab = "events" | "courts";
export type ExploreEvent = EventWithMetadata & {
  distance?: number;
};

export type SwipeDeckState = {
  currentIndex: number;
  dismissedIds: Set<string>;
};

export type SwipeDecks = Record<SwipeTab, SwipeDeckState>;

export function createInitialSwipeDeckState(): SwipeDeckState {
  return {
    currentIndex: 0,
    dismissedIds: new Set<string>(),
  };
}

export function createInitialSwipeDecks(): SwipeDecks {
  return {
    events: createInitialSwipeDeckState(),
    courts: createInitialSwipeDeckState(),
  };
}

export function clampSwipeIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (index < 0) return 0;
  if (index >= length) return length - 1;
  return index;
}

export function getVisibleSwipeItems<T extends { id: string }>(
  items: T[],
  dismissedIds: Set<string>
): T[] {
  return items.filter((item) => !dismissedIds.has(item.id));
}

export function dismissSwipeDeckItem(
  deck: SwipeDeckState,
  itemId: string,
  visibleLength: number
): SwipeDeckState {
  const dismissedIds = new Set(deck.dismissedIds);
  dismissedIds.add(itemId);

  return {
    currentIndex: clampSwipeIndex(deck.currentIndex, Math.max(0, visibleLength - 1)),
    dismissedIds,
  };
}

export function resetSwipeDeckState(): SwipeDeckState {
  return createInitialSwipeDeckState();
}

export function rankSwipeEvents(
  events: ExploreEvent[],
  currentUserId: string | null
): ExploreEvent[] {
  return [...events]
    .filter((event) => {
      if (event.participant_count >= event.max_participants) return false;
      if (!currentUserId) return true;
      if (event.creator_id === currentUserId) return false;
      if (event.is_joined_by_current_user) return false;
      return true;
    })
    .sort((left, right) => {
      const leftDistance = left.distance;
      const rightDistance = right.distance;
      if (leftDistance !== undefined || rightDistance !== undefined) {
        if (leftDistance === undefined) return 1;
        if (rightDistance === undefined) return -1;
        if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      }

      const leftDate = new Date(left.datetime).getTime();
      const rightDate = new Date(right.datetime).getTime();
      if (leftDate !== rightDate) return leftDate - rightDate;

      const leftFillRatio =
        left.max_participants > 0 ? left.participant_count / left.max_participants : 0;
      const rightFillRatio =
        right.max_participants > 0 ? right.participant_count / right.max_participants : 0;
      if (leftFillRatio !== rightFillRatio) return rightFillRatio - leftFillRatio;

      const titleCompare = left.title.localeCompare(right.title);
      if (titleCompare !== 0) return titleCompare;

      return left.id.localeCompare(right.id);
    });
}

export function rankSwipeCourts(courts: DisplayCourt[]): DisplayCourt[] {
  return [...courts].sort((left, right) => {
    const leftDistance = left.distance;
    const rightDistance = right.distance;
    if (leftDistance !== undefined || rightDistance !== undefined) {
      if (leftDistance === undefined) return 1;
      if (rightDistance === undefined) return -1;
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    }

    if (left.source !== right.source) {
      return left.source === "db" ? -1 : 1;
    }

    if (left.average_rating !== right.average_rating) {
      return right.average_rating - left.average_rating;
    }

    if (left.review_count !== right.review_count) {
      return right.review_count - left.review_count;
    }

    return left.name.localeCompare(right.name);
  });
}

export function isSwipeJoinable(
  event: ExploreEvent,
  currentUserId: string | null
): boolean {
  if (!currentUserId) return false;
  if (event.creator_id === currentUserId) return false;
  if (event.is_joined_by_current_user) return false;
  return event.participant_count < event.max_participants;
}
