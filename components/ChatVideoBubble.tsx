import { useVideoPlayer, VideoView } from "expo-video";
import { StyleSheet, View } from "react-native";

export function ChatVideoBubble({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (video) => {
    video.loop = false;
  });
  return (
    <View style={styles.frame}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 240,
    height: 180,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  video: { width: "100%", height: "100%" },
});
