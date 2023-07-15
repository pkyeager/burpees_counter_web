import React, { useRef, useState, useEffect } from "react";
import "./App.css";
import * as posenet from "@tensorflow-models/posenet";
import Webcam from "react-webcam";
import { drawKeypoints, drawSkeleton, drawPoint } from "./utilities";

const App = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [burpeeCount, setBurpeeCount] = useState(0);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [burpeesPerMinute, setBurpeesPerMinute] = useState(0);
  const [burpeesPerHour, setBurpeesPerHour] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [isReady, setReady] = useState(false);
  const [headDirection, setHeadDirection] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [lineTouchCount, setLineTouchCount] = useState(0);

  useEffect(() => {
    runPosenet();
  }, []);

  const runPosenet = async () => {
    const net = await posenet.load({
      inputResolution: { width: 640, height: 480 },
      scale: 0.8,
    });

    startCountdown(net);
  };

  const startCountdown = (net) => {
    let count = 3;
    const countdownInterval = setInterval(() => {
      if (count === 0) {
        clearInterval(countdownInterval);
        setReady(true);
        setWorkoutStarted(true);
        setStartTime(Date.now());
        setCountdown("");
      } else {
        setCountdown(count);
        count--;
      }
    }, 1000);

    setInterval(() => {
      detect(net);
    }, 100);
  };

  const detect = async (net) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      const pose = await net.estimateSinglePose(video);

      const headPosition = pose.keypoints[0].position;

      if (isHeadTouchingLine(headPosition, videoHeight)) {
        setLineTouchCount((count) => count + 1);
      }

      updateHeadDirection(pose);
      drawCanvas(pose, videoWidth, videoHeight);
    }
  };

  const isHeadTouchingLine = (position, videoHeight) => {
    const linePosition = Math.floor(videoHeight * 0.3); // Adjust the position as needed
    const tolerance = 10; // Adjust the tolerance as needed

    return (
      position.y >= linePosition - tolerance && position.y <= linePosition + tolerance
    );
  };

  useEffect(() => {
    if (lineTouchCount === 2) {
      incrementBurpeeCount();
      setLineTouchCount(0);
    }
  }, [lineTouchCount]);

  const incrementBurpeeCount = () => {
    setBurpeeCount((count) => count + 1);
  };

  const updateHeadDirection = (pose) => {
    const nosePosition = pose.keypoints[0].position;
    const leftEyePosition = pose.keypoints[1].position;
    const rightEyePosition = pose.keypoints[2].position;

    const isHeadGoingUp =
      nosePosition.y < leftEyePosition.y && nosePosition.y < rightEyePosition.y;
    const isHeadGoingDown =
      nosePosition.y > leftEyePosition.y && nosePosition.y > rightEyePosition.y;

    if (isHeadGoingUp) {
      setHeadDirection("Up");
    } else if (isHeadGoingDown) {
      setHeadDirection("Down");
    } else {
      setHeadDirection("");
    }
  };

  useEffect(() => {
    const calculateBurpeesPerMinute = () => {
      const minutes = workoutTimer / 60000; // Convert workout timer to minutes
      const burpeesPerMin = burpeeCount / minutes || 0;
      setBurpeesPerMinute(burpeesPerMin.toFixed(1));
    };

    const calculateBurpeesPerHour = () => {
      const hours = workoutTimer / 3600000; // Convert workout timer to hours
      const burpeesPerHr = burpeeCount / hours || 0;
      setBurpeesPerHour(burpeesPerHr.toFixed(1));
    };

    if (workoutStarted && endTime) {
      calculateBurpeesPerMinute();
      calculateBurpeesPerHour();
    }
  }, [burpeeCount, endTime, workoutStarted, workoutTimer]);

  useEffect(() => {
    if (workoutStarted) {
      const timerInterval = setInterval(() => {
        const currentTime = Date.now();
        setEndTime(currentTime);
        const elapsedTime = currentTime - startTime;
        setWorkoutTimer(elapsedTime);
      }, 1000);

      return () => {
        clearInterval(timerInterval);
      };
    }
  }, [workoutStarted, startTime]);

  const drawCanvas = (pose, videoWidth, videoHeight) => {
    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    // Draw reference line
    const referenceLineY = Math.floor(videoHeight * 0.3); // Adjust the position as needed
    ctx.beginPath();
    ctx.moveTo(0, referenceLineY);
    ctx.lineTo(videoWidth, referenceLineY);
    ctx.strokeStyle = isHeadTouchingLine(pose.keypoints[0].position, videoHeight)
      ? "green"
      : "red";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw keypoints and skeleton
    drawKeypoints(pose.keypoints, 0.6, ctx);
    drawSkeleton(pose.keypoints, 0.7, ctx);

    // Draw head point and label
    const headPoint = pose.keypoints[0].position;
    drawPoint(ctx, headPoint.y, headPoint.x, 5, "red");
    ctx.font = "20px Arial";
    ctx.fillStyle = "red";
    ctx.textAlign = "center";
    ctx.fillText("Head", headPoint.x, headPoint.y - 10);

    // Draw workout timer
    if (workoutStarted) {
      const formattedTime = formatTime(workoutTimer);
      ctx.font = "30px Arial";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText("Timer: " + formattedTime, videoWidth / 2, videoHeight + 30);
    }

    // Display burpee count, burpees per minute, burpees per hour, and head direction
    ctx.fillText("Burpee Count: " + burpeeCount, 10, videoHeight + 60);
    ctx.fillText(
      "Burpees Per Minute: " + burpeesPerMinute,
      10,
      videoHeight + 90
    );
    ctx.fillText("Burpees Per Hour: " + burpeesPerHour, 10, videoHeight + 120);
    ctx.fillText(
      "Head Direction: " + headDirection,
      videoWidth - 10,
      videoHeight + 60
    );
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 1000 / 60);
    const seconds = Math.floor((time / 1000) % 60);

    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <Webcam
          ref={webcamRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 9,
            width: 640,
            height: 480,
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 9,
            width: 640,
            height: 480,
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            zIndex: 10,
            color: "white",
          }}
        >
          {countdown > 0 && <h2>{countdown}</h2>}
          {countdown === "" && (
            <React.Fragment>
              <h3>Timer: {formatTime(workoutTimer)}</h3>
              <p>Burpee Count: {burpeeCount}</p>
              <p>Burpees Per Minute: {burpeesPerMinute}</p>
              <p>Burpees Per Hour: {burpeesPerHour}</p>
              <p>Head Direction: {headDirection}</p>
            </React.Fragment>
          )}
        </div>
      </header>
    </div>
  );
};

export default App;
