module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated 4 moved its babel plugin into react-native-worklets — must
    // be listed last, same as reanimated 3's own plugin was.
    plugins: ["react-native-worklets/plugin"],
  };
};
