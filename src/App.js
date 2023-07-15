import React, { useRef, useState, useEffect } from "react";
import "./App.css";
import * as posenet from "@tensorflow-models/posenet";
import Webcam from "react-webcam";
import { drawKeypoints, drawSkeleton, drawPoint } from "./utilities";

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [burpeeCount, setBurpeeCount] = useState(0);
  const [prevHeadPosition, setPrevHeadPosition] = useState(null);
  const [isBurpeeInProgress, setIsBurpeeInProgress] = useState(false);
  const [timer, setTimer] = useState(0);
  const [burpeesPerMinute, setBurpeesPerMinute] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);

  useEffect(() => {
    runPosenet();
    startTimer();
  }, []);

  const runPosenet = async () => {
    const net = await posenet.load({
      inputResolution: { width: 640, height: 480 },
      scale: 0.8,
    });

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

      if (!isBurpeeInProgress && isHeadUp(prevHeadPosition, headPosition)) {
        setIsBurpeeInProgress(true);
        setStartTime(Date.now());
      } else if (isBurpeeInProgress && isHeadDown(prevHeadPosition, headPosition)) {
        setIsBurpeeInProgress(false);
        setEndTime(Date.now());
        incrementBurpeeCount();
      }

      setPrevHeadPosition(headPosition);

      drawCanvas(pose, videoWidth, videoHeight);
    }
  };

  const isHeadDown = (prevPosition, currentPosition) => {
    return (
      prevPosition &&
      currentPosition.y > prevPosition.y + 5 // Adjust the threshold as needed
    );
  };

  const isHeadUp = (prevPosition, currentPosition) => {
    return (
      prevPosition &&
      currentPosition.y < prevPosition.y - 5 // Adjust the threshold as needed
    );
  };

  const incrementBurpeeCount = () => {
    setBurpeeCount((count) => count + 1);
  };

  const startTimer = () => {
    setInterval(() => {
      setTimer((time) => time + 1);
    }, 1000);
  };

  useEffect(() => {
    const minutes = timer / 60;
    const burpees = burpeeCount;
    const burpeesPerMin = burpees / minutes || 0;
    setBurpeesPerMinute(burpeesPerMin.toFixed(1));
  }, [timer, burpeeCount]);

  const drawCanvas = (pose, videoWidth, videoHeight) => {
    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    drawKeypoints(pose.keypoints, 0.6, ctx);
    drawSkeleton(pose.keypoints, 0.7, ctx);

    // Draw head point
    const headPoint = pose.keypoints[0].position;
    drawPoint(ctx, headPoint.y, headPoint.x, 5, "red");
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
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          <h2>Burpee Count: {burpeeCount}</h2>
          <h2>Burpees Per Minute: {burpeesPerMinute}</h2>
          <h2>Timer: {timer}</h2>
        </div>
      </header>
    </div>
  );
}

export default App;
