import { ImageSourcePropType } from "react-native";

const SPORT_COVERS: Record<string, ImageSourcePropType> = {
  basketball: require("../../assets/covers/basketball.jpg"),
  cycling: require("../../assets/covers/cycling.jpg"),
  gym: require("../../assets/covers/gym.jpg"),
  hiking: require("../../assets/covers/hiking.jpg"),
  pickleball: require("../../assets/covers/pickleball.jpg"),
  running: require("../../assets/covers/running.jpg"),
  soccer: require("../../assets/covers/soccer.jpg"),
  tennis: require("../../assets/covers/tennis.jpg"),
  yoga: require("../../assets/covers/yoga.jpg"),
};

export function getSportCover(sportType: string): ImageSourcePropType {
  return SPORT_COVERS[sportType] || SPORT_COVERS.tennis;
}
