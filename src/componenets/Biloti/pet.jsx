import { useEffect, useRef } from "react";

import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

import bilotiSheet from "../../assets/biloti.png";

import "./pet.css";

export default function Biloti() {
  const petRef = useRef(null);
  const canvasRef = useRef(null);

  const appWindow = getCurrentWindow();

  // --------------------------------------------------
  // Animation state
  // --------------------------------------------------

  const animationRef = useRef({
    name: "idle",
    frame: 0,
    playing: false,
    startedAt: 0,
    duration: 0,
    frameCount: 8,
  });

  const animationFrameRef = useRef(null);

  const keyboardSideRef = useRef(false);

  // --------------------------------------------------
  // Sprite
  // --------------------------------------------------

  const spriteInfoRef = useRef({
    image: null,
  });

  // --------------------------------------------------
  // Window / cursor
  // --------------------------------------------------

  const winPosRef = useRef({
    x: 0,
    y: 0,
  });

  const cursorRef = useRef({
    x: 0,
    y: 0,
  });

  // --------------------------------------------------
  // Eye tracking
  // --------------------------------------------------

  const eyeDataRef = useRef(new Map());

  // --------------------------------------------------
  // Sleep / interaction
  // --------------------------------------------------

  const lastInteractionRef = useRef(
    performance.now()
  );

  const sleepingRef = useRef(false);

  // --------------------------------------------------
  // Exact sprite rectangles
  // --------------------------------------------------

  const spriteFrames = {
    idle: [
      [40, 7, 109, 99],
      [174, 7, 111, 99],
      [308, 7, 110, 99],
      [442, 7, 114, 99],
      [578, 7, 115, 99],
      [716, 7, 113, 99],
      [846, 7, 113, 99],
      [982, 7, 112, 99],
    ],

    blink: [
      [55, 122, 116, 97],
      [208, 122, 116, 97],
      [351, 122, 115, 97],
      [494, 122, 117, 97],
      [635, 122, 115, 97],
      [784, 122, 116, 97],
    ],

    walk: [
      [21, 228, 123, 107],
      [167, 228, 116, 107],
      [311, 228, 112, 107],
      [452, 228, 114, 107],
      [588, 228, 120, 107],
      [734, 228, 123, 107],
      [876, 228, 116, 107],
      [1019, 228, 106, 107],
    ],

    run: [
      [21, 343, 124, 105],
      [163, 343, 122, 105],
      [305, 343, 129, 105],
      [449, 343, 131, 105],
      [594, 343, 130, 105],
      [734, 343, 117, 105],
      [866, 343, 133, 105],
      [1006, 343, 124, 105],
    ],

    jump: [
      [24, 456, 118, 114],
      [159, 456, 122, 114],
      [296, 456, 128, 114],
      [451, 456, 129, 114],
      [603, 456, 122, 114],
      [749, 456, 134, 114],
    ],

    sit: [
      [37, 572, 107, 105],
      [174, 572, 106, 105],
      [319, 572, 92, 105],
      [449, 572, 109, 105],
    ],

    sleep: [
      [32, 692, 112, 82],
      [172, 692, 119, 82],
      [317, 692, 113, 82],
      [454, 692, 112, 82],
      [591, 692, 125, 82],
      [749, 692, 137, 82],
    ],

    keyboardLeft: [
      [27, 788, 131, 113],
      [179, 788, 127, 113],
      [324, 788, 128, 113],
      [467, 788, 127, 113],
      [609, 788, 128, 113],
      [760, 788, 126, 113],
    ],

    keyboardRight: [
      [25, 910, 135, 117],
      [179, 910, 127, 117],
      [325, 910, 127, 117],
      [468, 910, 126, 117],
      [612, 910, 125, 117],
      [765, 910, 123, 117],
    ],

    happy: [
      [21, 1032, 112, 101],
      [179, 1032, 112, 101],
      [328, 1032, 116, 101],
      [472, 1032, 111, 101],
      [612, 1032, 116, 101],
      [758, 1032, 125, 101],
    ],

    curious: [
      [40, 1144, 101, 107],
      [187, 1144, 110, 107],
      [325, 1144, 113, 107],
      [463, 1144, 107, 107],
      [588, 1144, 136, 107],
      [766, 1144, 111, 107],
    ],

    extra: [
      [13, 1256, 102, 104],
      [125, 1256, 102, 104],
      [242, 1256, 356, 104],
      [616, 1256, 92, 104],
      [715, 1256, 103, 104],
      [824, 1256, 71, 104],
      [903, 1256, 116, 104],
      [1030, 1256, 100, 104],
    ],
  };

  // --------------------------------------------------
  // Play animation
  // --------------------------------------------------

  const playAnimation = (
    name,
    frameCount,
    duration
  ) => {
    animationRef.current = {
      name,
      frame: 0,
      playing: true,
      startedAt: performance.now(),
      duration,
      frameCount,
    };
  };

  // --------------------------------------------------
  // Register interaction
  // --------------------------------------------------

  const registerInteraction = () => {
    lastInteractionRef.current =
      performance.now();

    if (sleepingRef.current) {
      sleepingRef.current = false;

      playAnimation(
        "blink",
        6,
        180
      );
    }
  };

  // --------------------------------------------------
  // Build eye masks
  // --------------------------------------------------

  const buildEyeData = (image) => {
    const map = new Map();

    Object.entries(spriteFrames).forEach(
      ([animationName, frames]) => {
        frames.forEach(
          ([sx, sy, sw, sh], frameIndex) => {
            const temp =
              document.createElement(
                "canvas"
              );

            temp.width = sw;
            temp.height = sh;

            const tempCtx =
              temp.getContext("2d");

            if (!tempCtx) return;

            tempCtx.imageSmoothingEnabled =
              false;

            tempCtx.drawImage(
              image,
              sx,
              sy,
              sw,
              sh,
              0,
              0,
              sw,
              sh
            );

            const imageData =
              tempCtx.getImageData(
                0,
                0,
                sw,
                sh
              );

            const data =
              imageData.data;

            const visited =
              new Uint8Array(
                sw * sh
              );

            const components = [];

            const isWhite = (
              x,
              y
            ) => {
              const i =
                (y * sw + x) * 4;

              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];

              return (
                a > 180 &&
                r > 220 &&
                g > 220 &&
                b > 220
              );
            };

            for (
              let y = 0;
              y < sh;
              y++
            ) {
              for (
                let x = 0;
                x < sw;
                x++
              ) {
                const index =
                  y * sw + x;

                if (
                  visited[index] ||
                  !isWhite(x, y)
                ) {
                  continue;
                }

                const queue = [[x, y]];

                visited[index] = 1;

                let minX = x;
                let maxX = x;
                let minY = y;
                let maxY = y;

                const pixels = [];

                while (
                  queue.length
                ) {
                  const [
                    px,
                    py,
                  ] = queue.pop();

                  pixels.push([
                    px,
                    py,
                  ]);

                  minX =
                    Math.min(
                      minX,
                      px
                    );

                  maxX =
                    Math.max(
                      maxX,
                      px
                    );

                  minY =
                    Math.min(
                      minY,
                      py
                    );

                  maxY =
                    Math.max(
                      maxY,
                      py
                    );

                  const neighbors = [
                    [px + 1, py],
                    [px - 1, py],
                    [px, py + 1],
                    [px, py - 1],
                  ];

                  for (
                    const [
                      nx,
                      ny,
                    ] of neighbors
                  ) {
                    if (
                      nx < 0 ||
                      nx >= sw ||
                      ny < 0 ||
                      ny >= sh
                    ) {
                      continue;
                    }

                    const ni =
                      ny * sw + nx;

                    if (
                      visited[ni] ||
                      !isWhite(
                        nx,
                        ny
                      )
                    ) {
                      continue;
                    }

                    visited[ni] = 1;

                    queue.push([
                      nx,
                      ny,
                    ]);
                  }
                }

                const width =
                  maxX - minX + 1;

                const height =
                  maxY - minY + 1;

                if (
                  width >= 8 &&
                  height >= 8 &&
                  width < 40 &&
                  height < 40
                ) {
                  components.push({
                    x: minX,
                    y: minY,
                    width,
                    height,
                    pixels,
                  });
                }
              }
            }

            components.sort(
              (a, b) =>
                a.x - b.x
            );

            const eyes =
              components.slice(
                0,
                2
              );

            if (
              eyes.length !== 2
            ) {
              return;
            }

            const eyeMasks =
              eyes.map(
                (eye) => {
                  const mask =
                    document.createElement(
                      "canvas"
                    );

                  mask.width =
                    eye.width;

                  mask.height =
                    eye.height;

                  const maskCtx =
                    mask.getContext(
                      "2d"
                    );

                  if (!maskCtx) {
                    return null;
                  }

                  maskCtx.fillStyle =
                    "white";

                  maskCtx.fillRect(
                    0,
                    0,
                    eye.width,
                    eye.height
                  );

                  for (
                    let py = 1;
                    py <
                    eye.height - 1;
                    py++
                  ) {
                    for (
                      let px = 1;
                      px <
                      eye.width - 1;
                      px++
                    ) {
                      const sourceX =
                        eye.x + px;

                      const sourceY =
                        eye.y + py;

                      const i =
                        (
                          sourceY *
                            sw +
                          sourceX
                        ) * 4;

                      const r =
                        data[i];

                      const g =
                        data[i + 1];

                      const b =
                        data[i + 2];

                      const a =
                        data[i + 3];

                      if (
                        a > 100 &&
                        r < 100 &&
                        g < 100 &&
                        b < 100
                      ) {
                        maskCtx.fillStyle =
                          "white";

                        maskCtx.fillRect(
                          px,
                          py,
                          1,
                          1
                        );
                      }
                    }
                  }

                  return {
                    x: eye.x,
                    y: eye.y,
                    width:
                      eye.width,
                    height:
                      eye.height,
                    canvas: mask,
                  };
                }
              );

            map.set(
              `${animationName}-${frameIndex}`,
              eyeMasks
            );
          }
        );
      }
    );

    eyeDataRef.current = map;
  };

  // --------------------------------------------------
  // Draw frame
  // --------------------------------------------------

  const drawFrame = (
    ctx,
    canvas,
    animationName,
    frame,
    time = performance.now()
  ) => {
    const image =
      spriteInfoRef.current.image;

    if (!image) return;

    const frames =
      spriteFrames[
        animationName
      ] ||
      spriteFrames.idle;

    const safeFrame =
      Math.max(
        0,
        Math.min(
          frame,
          frames.length - 1
        )
      );

    const [
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
    ] = frames[safeFrame];

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.imageSmoothingEnabled =
      false;

    // ------------------------------------------------
    // Breathing
    // ------------------------------------------------

    const scale = 1.25;

    let breathY = 0;
    let breathScaleY = 1;
    let breathScaleX = 1;

    if (
      animationName === "idle"
    ) {
      const breathing =
        Math.sin(
          time * 0.003
        ) *
          0.5 +
        0.5;

      breathScaleY =
        1 +
        breathing *
          0.018;

      breathScaleX =
        1 -
        breathing *
          0.006;

      breathY =
        Math.round(
          breathing * 1.2
        );
    }

    const drawWidth =
      Math.round(
        sourceWidth *
          scale *
          breathScaleX
      );

    const drawHeight =
      Math.round(
        sourceHeight *
          scale *
          breathScaleY
      );

    const drawX =
      Math.round(
        (canvas.width -
          drawWidth) /
          2
      );

    const drawY =
      Math.round(
        canvas.height -
          drawHeight -
          8 -
          breathY
      );

    // ------------------------------------------------
    // Sprite
    // ------------------------------------------------

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );

    // ------------------------------------------------
    // Eye tracking
    // ------------------------------------------------

    if (
      animationName === "blink" ||
      animationName === "sleep"
    ) {
      return;
    }

    const eyes =
      eyeDataRef.current.get(
        `${animationName}-${safeFrame}`
      );

    if (
      !eyes ||
      eyes.length !== 2
    ) {
      return;
    }

    const cursor =
      cursorRef.current;

    const localCursorX =
      cursor.x -
      winPosRef.current.x;

    const localCursorY =
      cursor.y -
      winPosRef.current.y;

    const centerX =
      canvas.width / 2;

    const centerY =
      canvas.height / 2;

    const dx =
      localCursorX -
      centerX;

    const dy =
      localCursorY -
      centerY;

    const distance =
      Math.sqrt(
        dx * dx +
          dy * dy
      );

    // More movement when cursor is close.
    const isClose =
      distance < 500;

    const maxPupilX =
      isClose
        ? 5.5
        : 3.5;

    const maxPupilY =
      isClose
        ? 4.5
        : 3.0;

    const directionLength =
      Math.sqrt(
        dx * dx +
          dy * dy
      ) || 1;

    const directionX =
      dx /
      directionLength;

    const directionY =
      dy /
      directionLength;

    eyes.forEach(
      (eye) => {
        if (!eye) return;

        const eyeX =
          drawX +
          eye.x *
            (drawWidth /
              sourceWidth);

        const eyeY =
          drawY +
          eye.y *
            (drawHeight /
              sourceHeight);

        const eyeWidth =
          eye.width *
          (drawWidth /
            sourceWidth);

        const eyeHeight =
          eye.height *
          (drawHeight /
            sourceHeight);

        // Remove baked-in pupil.
        ctx.drawImage(
          eye.canvas,
          eyeX,
          eyeY,
          eyeWidth,
          eyeHeight
        );

        const pupilSize =
          Math.max(
            3,
            Math.min(
              eyeWidth,
              eyeHeight
            ) * 0.38
          );

        const pupilX =
          eyeX +
          eyeWidth / 2 -
          pupilSize / 2 +
          directionX *
            maxPupilX;

        const pupilY =
          eyeY +
          eyeHeight / 2 -
          pupilSize / 2 +
          directionY *
            maxPupilY;

        ctx.fillStyle =
          "#000";

        ctx.fillRect(
          Math.round(
            pupilX
          ),
          Math.round(
            pupilY
          ),
          Math.round(
            pupilSize
          ),
          Math.round(
            pupilSize
          )
        );
      }
    );
  };

  // --------------------------------------------------
  // Animation loop
  // --------------------------------------------------

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext(
        "2d"
      );

    if (!ctx) return;

    canvas.width = 200;
    canvas.height = 200;

    const image =
      new Image();

    image.src =
      bilotiSheet;

    image.onload = () => {
      spriteInfoRef.current = {
        image,
      };

      buildEyeData(image);

      drawFrame(
        ctx,
        canvas,
        "idle",
        0
      );

      const animate =
        (time) => {
          // ------------------------------------------
          // Sleeping
          // ------------------------------------------

          if (
            sleepingRef.current
          ) {
            const sleepFrames =
              spriteFrames.sleep.length;

            const sleepDuration =
              1200;

            const sleepFrame =
              Math.floor(
                (
                  time %
                  sleepDuration
                ) /
                  (
                    sleepDuration /
                    sleepFrames
                  )
              );

            drawFrame(
              ctx,
              canvas,
              "sleep",
              sleepFrame,
              time
            );

            animationFrameRef.current =
              requestAnimationFrame(
                animate
              );

            return;
          }

          // ------------------------------------------
          // Normal animation
          // ------------------------------------------

          const animation =
            animationRef.current;

          if (
            animation.playing
          ) {
            const elapsed =
              time -
              animation.startedAt;

            const frameCount =
              animation.frameCount ||
              1;

            const frameDuration =
              animation.duration /
              frameCount;

            let frame =
              Math.floor(
                elapsed /
                  frameDuration
              );

            if (
              frame >=
              frameCount
            ) {
              animationRef.current = {
                name: "idle",
                frame: 0,
                playing: false,
                startedAt: time,
                duration: 0,
                frameCount:
                  spriteFrames
                    .idle.length,
              };

              frame = 0;
            }

            animationRef.current.frame =
              frame;
          }

          drawFrame(
            ctx,
            canvas,
            animationRef.current
              .name,
            animationRef.current
              .frame,
            time
          );

          animationFrameRef.current =
            requestAnimationFrame(
              animate
            );
        };

      animationFrameRef.current =
        requestAnimationFrame(
          animate
        );
    };

    return () => {
      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        );
      }
    };
  }, []);

  // --------------------------------------------------
  // Window position + cursor tracking
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    let unlistenCursor;
    let unlistenMoved;

    const handleCursorMoved =
      ({ payload }) => {
        cursorRef.current = {
          x: payload.x,
          y: payload.y,
        };
      };

    const updateWindowPosition =
      async () => {
        try {
          const pos =
            await appWindow.outerPosition();

          winPosRef.current = {
            x: pos.x,
            y: pos.y,
          };
        } catch (error) {
          
        }
      };

    const handleMouseMove =
      (event) => {
        const globalX =
          Math.round(
            winPosRef.current.x +
              event.clientX
          );

        const globalY =
          Math.round(
            winPosRef.current.y +
              event.clientY
          );

        cursorRef.current = {
          x: globalX,
          y: globalY,
        };

        invoke(
          "set_cursor_position",
          {
            position: {
              x: globalX,
              y: globalY,
            },
          }
        ).catch(() => {});
      };

    const start = async () => {
      await updateWindowPosition();

      if (cancelled) return;

      unlistenCursor =
        await listen(
          "cursor-moved",
          handleCursorMoved
        );

      unlistenMoved =
        await appWindow.onMoved(
          updateWindowPosition
        );

      petRef.current?.addEventListener(
        "mousemove",
        handleMouseMove
      );
    };

    start();

    return () => {
      cancelled = true;

      unlistenCursor?.();
      unlistenMoved?.();

      petRef.current?.removeEventListener(
        "mousemove",
        handleMouseMove
      );
    };
  }, []);

  // --------------------------------------------------
  // Global keyboard / mouse / settings
  // --------------------------------------------------

  useEffect(() => {
    let unlistenGlobal;
    let unlistenVisibility;
    let unlistenSize;

    const handleGlobalInput =
      ({ payload }) => {
        if (
          payload.value !== 1
        ) {
          return;
        }

        // --------------------------------------------
        // Keyboard
        // --------------------------------------------

        if (
          payload.event_type ===
            "KEY" &&
          payload.code !== 272
        ) {
          lastInteractionRef.current =
            performance.now();

          if (
            sleepingRef.current
          ) {
            sleepingRef.current =
              false;

            playAnimation(
              "blink",
              6,
              180
            );

            return;
          }

          keyboardSideRef.current =
            !keyboardSideRef.current;

          if (
            keyboardSideRef.current
          ) {
            playAnimation(
              "keyboardLeft",
              6,
              180
            );
          } else {
            playAnimation(
              "keyboardRight",
              6,
              180
            );
          }
        }
      };

    const start =
      async () => {
        unlistenGlobal =
          await listen(
            "global-input",
            handleGlobalInput
          );

        unlistenVisibility =
          await listen(
            "biloti-visibility",
            ({ payload }) => {
              if (payload) {
                appWindow.show();
              } else {
                appWindow.hide();
              }
            }
          );

        unlistenSize =
          await listen(
            "biloti-size",
            async ({
              payload,
            }) => {
              const size =
                Number(payload);

              await appWindow.setSize(
                {
                  type: "Logical",
                  width: size,
                  height: size,
                }
              );

              const scale =
                size / 200;

              petRef.current?.style.setProperty(
                "--pet-scale",
                scale
              );
            }
          );
      };

    start();

    return () => {
      unlistenGlobal?.();
      unlistenVisibility?.();
      unlistenSize?.();
    };
  }, []);

  // --------------------------------------------------
  // Random blinking
  // --------------------------------------------------

  useEffect(() => {
    let blinkTimer;
    let cancelled = false;

    const scheduleBlink =
      () => {
        const delay =
          3000 +
          Math.random() * 5000;

        blinkTimer =
          setTimeout(() => {
            if (cancelled) return;

            if (
              !animationRef.current
                .playing &&
              !sleepingRef.current
            ) {
              playAnimation(
                "blink",
                6,
                180
              );
            }

            scheduleBlink();
          }, delay);
      };

    scheduleBlink();

    return () => {
      cancelled = true;

      clearTimeout(
        blinkTimer
      );
    };
  }, []);

  // --------------------------------------------------
  // Cursor curiosity
  // --------------------------------------------------

  useEffect(() => {
    let curiosityTimer;
    let cancelled = false;

    const checkCursor =
      () => {
        if (cancelled) return;

        if (
          sleepingRef.current
        ) {
          curiosityTimer =
            setTimeout(
              checkCursor,
              1200
            );

          return;
        }

        const cursor =
          cursorRef.current;

        const windowPos =
          winPosRef.current;

        const centerX =
          windowPos.x + 100;

        const centerY =
          windowPos.y + 100;

        const dx =
          cursor.x -
          centerX;

        const dy =
          cursor.y -
          centerY;

        const distance =
          Math.sqrt(
            dx * dx +
              dy * dy
          );

        // Curiosity only within 500px.
        if (
          distance < 500 &&
          !animationRef.current
            .playing
        ) {
          if (
            Math.random() <
            0.25
          ) {
            playAnimation(
              "curious",
              6,
              500
            );
          }
        }

        curiosityTimer =
          setTimeout(
            checkCursor,
            1200
          );
      };

    checkCursor();

    return () => {
      cancelled = true;

      clearTimeout(
        curiosityTimer
      );
    };
  }, []);

  // --------------------------------------------------
  // Random idle animations
  // --------------------------------------------------

  useEffect(() => {
    let idleTimer;
    let cancelled = false;

    const scheduleIdle =
      () => {
        const delay =
          7000 +
          Math.random() * 9000;

        idleTimer =
          setTimeout(() => {
            if (cancelled) return;

            if (
              sleepingRef.current ||
              animationRef.current
                .playing
            ) {
              scheduleIdle();
              return;
            }

            const random =
              Math.random();

            if (
              random < 0.40
            ) {
              // Look around.
              playAnimation(
                "curious",
                6,
                500
              );
            } else if (
              random < 0.70
            ) {
              // Small sit movement.
              playAnimation(
                "sit",
                4,
                500
              );
            } else if (
              random < 0.90
            ) {
              // Tiny walk.
              playAnimation(
                "walk",
                8,
                700
              );
            } else {
              // Small happy movement.
              playAnimation(
                "happy",
                6,
                450
              );
            }

            scheduleIdle();
          }, delay);
      };

    scheduleIdle();

    return () => {
      cancelled = true;

      clearTimeout(
        idleTimer
      );
    };
  }, []);

  // --------------------------------------------------
  // Sleep after inactivity
  // --------------------------------------------------

  useEffect(() => {
    const inactivityTimer =
      setInterval(() => {
        if (
          sleepingRef.current
        ) {
          return;
        }

        const inactiveFor =
          performance.now() -
          lastInteractionRef.current;

        // 30 seconds.
        if (
          inactiveFor >=
          30000
        ) {
          if (
            !animationRef.current
              .playing
          ) {
            sleepingRef.current =
              true;
          }
        }
      }, 1000);

    return () => {
      clearInterval(
        inactivityTimer
      );
    };
  }, []);

  // --------------------------------------------------
  // Mouse click + drag
  // --------------------------------------------------

  const handlePetMouseDown =
    () => {
      lastInteractionRef.current =
        performance.now();

      if (
        sleepingRef.current
      ) {
        sleepingRef.current =
          false;

        playAnimation(
          "blink",
          6,
          180
        );
      } else {
        // One click = blink.
        playAnimation(
          "blink",
          6,
          180
        );
      }

      // Keep dragging.
      appWindow
        .startDragging()
        .catch((error) => {
        
        });
    };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div
      className="pet"
      ref={petRef}
      onMouseDown={
        handlePetMouseDown
      }
    >
      <canvas
        ref={canvasRef}
        className="biloti-canvas"
        width="200"
        height="200"
      />
    </div>
  );
}