const { withMainApplication } = require('@expo/config-plugins');

// onnxruntime-react-native's Gradle module gets pulled into the build (it
// shows up as a subproject and compiles fine), but its ReactPackage never
// makes it into the generated PackageList — NativeModules.Onnxruntime is
// null at runtime as a result (confirmed via
// node_modules/onnxruntime-react-native/lib/binding.ts, which crashes on
// `Module.install()` since `Module` is that null NativeModules lookup).
// Multiple open, unresolved upstream GitHub issues report the same gap
// specifically under Expo + autolinking. This plugin manually adds the
// package the same way MainApplication.kt's own generated comment suggests
// ("Packages that cannot be autolinked yet can be added manually here").
module.exports = function withOnnxruntimePackage(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    const importLine = 'import ai.onnxruntime.reactnative.OnnxruntimePackage';
    if (!contents.includes(importLine)) {
      contents = contents.replace(
        'import com.facebook.react.ReactPackage',
        `import com.facebook.react.ReactPackage\n${importLine}`,
      );
    }

    const addLine = 'add(OnnxruntimePackage())';
    if (!contents.includes(addLine)) {
      contents = contents.replace(
        'PackageList(this).packages.apply {',
        `PackageList(this).packages.apply {\n              ${addLine}`,
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
