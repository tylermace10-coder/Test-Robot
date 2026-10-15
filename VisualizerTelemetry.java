package frc.robot.utils;

import com.pathplanner.lib.util.PathPlannerLogging;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.networktables.DoubleArrayPublisher;
import edu.wpi.first.networktables.NetworkTableInstance;

/** Optional integration; copy into robot source and install once after AutoBuilder setup. */
public final class VisualizerTelemetry {
  private static final DoubleArrayPublisher ACTUAL = NetworkTableInstance.getDefault()
      .getDoubleArrayTopic("/FRCVisualizer/actualPose").publish();
  private static final DoubleArrayPublisher PLANNED = NetworkTableInstance.getDefault()
      .getDoubleArrayTopic("/FRCVisualizer/plannedPose").publish();

  private VisualizerTelemetry() {}

  /** These setters replace existing callbacks; compose publishes with existing logging if needed. */
  public static void install() {
    PathPlannerLogging.setLogCurrentPoseCallback(VisualizerTelemetry::publishActual);
    PathPlannerLogging.setLogTargetPoseCallback(VisualizerTelemetry::publishPlanned);
  }

  /** Call from odometry updates for custom routines; poses must use the blue field origin. */
  public static void publishActual(Pose2d pose) { ACTUAL.set(array(pose)); }

  public static void publishPlanned(Pose2d pose) { PLANNED.set(array(pose)); }

  private static double[] array(Pose2d pose) {
    return new double[] {pose.getX(), pose.getY(), pose.getRotation().getDegrees()};
  }
}
