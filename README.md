# FRC Auto Visualizer

Native VS Code sidebar and editor-tab viewer for this WPILib Java project. The extension is separate from Gradle and roboRIO deployment. Requires VS Code 1.95+ and Node 22+ to build; the installed VSIX needs neither npm nor a connected robot.

## Launch beside Java

1. In a PowerShell terminal at the repository root, run:
   ```powershell
   cd vscode-frc-visualizer
   npm.cmd ci
   npm.cmd test
   cd ..
   ```
2. In **Run and Debug**, select **FRC Visualizer Extension** and press F5. The existing WPILib debug configurations remain available.
3. In the Extension Development Host, click **FRC Auto Visualizer** in the activity bar. Open `Autos.java` alongside it.
4. Right-click the visualizer activity bar icon and choose **Move To → Secondary Side Bar**. If hidden, enable it with **View → Appearance → Secondary Side Bar**. VS Code owns this docking behavior.
5. Choose an auto or path. Use **Expand** or **FRC Visualizer: Open Full Field Editor** for an editor tab. Both views share selection, alliance and timeline position.
6. Save `.path` or `.auto` files in `src/main/deploy/pathplanner` to reload. Click a Java **View path** CodeLens, or put the cursor on a literal reference and run **FRC Visualizer: Open Path Reference**. That command also opens the active `.path` or `.auto` file.

Mouse wheel zooms at the cursor; drag empty space to pan; **Fit** resets the camera. Click a path to select it. Cyan shows the selected curve and anchors, amber shows control handles, green/orange robots show start/end poses, purple shows rotation targets, and yellow shows event markers. The white robot follows the timeline. Robot dimensions come from `settings.json`.

Selection and timeline are saved in workspace state. Each view preserves its camera when hidden using VS Code's retained webview context and `getState`/`setState`. Sidebar and editor cameras are independent. Playback pauses while a webview is hidden; starting playback is local to that view. Unsaved waypoint drafts are local and are discarded when the view is closed.

## Install in normal VS Code

```powershell
cd vscode-frc-visualizer
npm.cmd ci
npm.cmd test
npm.cmd run package
code --install-extension .\frc-auto-visualizer-0.1.0.vsix
```

Alternatively use **Extensions → … → Install from VSIX…**. Open the robot project, then click the activity bar icon. No Marketplace publishing is required. For browser checks, run `npm.cmd run test:browser`; set `FRC_BROWSER` to a Chrome/Edge executable if Chrome is not in its default Windows location.

## Official field and compatibility

This project has PathPlannerLib **2026.1.2**, GradleRIO **2026.2.1**, and PathPlanner path/auto schema **2025.0**. No installed PathPlanner GUI assets were accessible in the standard local app locations, so the exact image and metadata were retrieved from the matching upstream release:

- [field26.png](https://github.com/mjansen4857/pathplanner/blob/v2026.1.2/images/field26.png)
- [FieldImage metadata](https://github.com/mjansen4857/pathplanner/blob/v2026.1.2/lib/widgets/field_image.dart)
- [FlippingUtil](https://github.com/mjansen4857/pathplanner/blob/v2026.1.2/pathplannerlib/src/main/java/com/pathplanner/lib/util/FlippingUtil.java)
- [Upstream MIT license](https://github.com/mjansen4857/pathplanner/blob/v2026.1.2/LICENSE), bundled as `media/PathPlanner-LICENSE`

The image is 3508 × 1814 pixels, 200 pixels/meter, with a **0.5 m border on every edge**. The playable field is **16.54 × 8.07 m**. Blue origin is the lower-left field corner; X increases right and Y up. Image mapping is `px=(x+0.5)*200`, `py=(8.07+0.5-y)*200`, followed by uniform fit, zoom and pan. Red path preview uses the installed library's rotational flip `(16.54-x, 8.07-y, heading+180°)` and keeps the field image in the standard orientation. Telemetry always uses blue-origin coordinates and is never flipped again.

If the asset is missing, restore `media/field26.png` from the pinned upstream link, run `npm.cmd run package`, and reinstall. The UI reports a missing image; it does not draw a replacement field. Other years and custom field imports are not supported in this version.

Only the verified `2025.0` schema is accepted. Malformed/incompatible files and missing auto path references appear in diagnostics without hiding valid paths. Choreo autos are reported as unsupported. Multiple workspace roots keep auto references scoped to their project.

## Preview limits

Bézier geometry comes directly from saved control points. **Playback is a geometric approximation**, using distance and constant `globalConstraints.maxVelocity`; the displayed speed is that preview speed. Rotation interpolates the saved starting rotation, rotation targets and ending rotation using the shortest angular arc. Acceleration, constraint zones, angular limits, point-towards zones and drivetrain dynamics are not simulated. Use PathPlanner/PathPlannerLib for authoritative trajectories, timings and feasibility.

Whole-routine playback concatenates referenced path geometry in command-tree order. The command tree also displays waits, parallel groups and named commands, but the preview does not simulate their execution or infer motion from Java. Disconnected paths jump between segments. Runtime branching and custom Java commands require explicit telemetry. Java navigation recognizes literal `fromPathFile`, this project's `loadPathByName`, `buildAuto`, `getAllAutoPaths`, `getPathGroupFromAutoFile`, and `new PathPlannerAuto` calls. Computed strings and arbitrary Java movement are not resolved.

## Waypoint editing

The default is read-only. Select an individual path, click **Edit waypoints**, then drag cyan anchors or amber control handles. Anchor moves translate attached handles. **Discard** cancels; **Save** writes the existing schema and preserves other JSON fields, including unknown fields. Formatting is normalized to two-space JSON.

Before writing, the extension checks the original SHA-256 and refuses dirty VS Code path documents or externally changed files. It writes an exact-byte backup to `.frc-visualizer-backups/<name>-<timestamp>-<random>.path.bak` at the robot project root, then checks the hash again and saves. Backups are outside `src/main/deploy`. Saved edits reload both views. Avoid simultaneous writes from PathPlanner during a save: the hash check is optimistic concurrency, not an operating-system lock. Saving requires a trusted workspace. New waypoints, rotation/event editing and constraint editing are not implemented.

## Optional live NT4 telemetry

Run **FRC Visualizer: Connect NT4 Telemetry** (or **Connect NT4**) and enter `ws://localhost:5810/nt/frc-visualizer` for simulation, or `ws://<roboRIO-address>:5810/nt/frc-visualizer` for a robot. Connection is explicit; saved paths work offline. The client subscribes using NT4.1, handles MessagePack frames, pings, disconnects and retries. It never publishes robot commands.

Configure `frcVisualizer.actualPoseTopic` and `frcVisualizer.plannedPoseTopic` as **double arrays `[x meters, y meters, heading degrees]`**. Defaults are `/FRCVisualizer/actualPose` and `/FRCVisualizer/plannedPose`. The last 2000 poses appear as separate lime actual and magenta planned traces; traces reset on disconnect/reconnect. This does not decode WPILib struct/raw pose topics or vendor-specific schemas automatically.

An optional robot-side example is in `examples/VisualizerTelemetry.java`. It is outside robot source and deployment. To opt in, copy it to `src/main/java/frc/robot/utils` and call `VisualizerTelemetry.install()` once after configuring AutoBuilder. Its callbacks run during PathPlanner following; publish odometry explicitly for non-PathPlanner movement. PathPlanner logging setters replace callbacks: compose these publishes with existing callbacks if your robot already uses them. The transport was tested against a local NT4 mock; robot hardware and WPILib simulation telemetry have not been tested in this session.

## Validation

`npm.cmd test` compiles TypeScript and tests all repository files, coordinate mapping, rotation interpolation, Java references, JSON preservation, backup writes, stale/dirty-file rejection, shared view state, and NT4 frames. All ten automated tests passed. Browser checks passed for production HTML/CSP, the official image, narrow/full layouts, selection, timeline, auto tree, zoom, and waypoint drag/discard. A real VS Code Extension Development Host passed activation, command registration, Java CodeLens, sidebar focus and editor-panel checks. The optional Java example compiled against installed WPILib 2026.2.1 and PathPlannerLib 2026.1.2 (two missing Jackson annotation warnings in the minimal standalone classpath).

The native extension-host smoke test is `test/vscode.cjs`; invoke VS Code with `--extensionDevelopmentPath=<extension directory> --extensionTestsPath=<absolute test/vscode.cjs> <robot workspace>` using an isolated user-data directory. This test uses the real host; sidebar layout and interactions are separately exercised by the browser suite with a VS Code API bridge.
