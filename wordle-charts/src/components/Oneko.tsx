// Copyright © 2022 adryd
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import { useEffect, useRef } from 'react';

type SpritePosition = [number, number];
type SpriteSets = {
  [key: string]: SpritePosition[];
};

const Oneko = ({ 
  catImage = '/oneko.gif',
  initialPosition,
  targetPosition = null
}: { 
  catImage?: string;
  initialPosition: { x: number; y: number };
  targetPosition?: { x: number; y: number } | null;
}) => {
  const nekoRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const lastFrameTimestampRef = useRef<number>();
  const nekoPosRef = useRef({ x: initialPosition.x, y: initialPosition.y });
  const mousePosRef = useRef({ x: initialPosition.x, y: initialPosition.y });
  const idleRef = useRef({
    time: 0,
    animation: null as string | null,
    animationFrame: 0,
  });

  const spriteSets: SpriteSets = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
    scratchWallN: [[0, 0], [0, -1]],
    scratchWallS: [[-7, -1], [-6, -2]],
    scratchWallE: [[-2, -2], [-2, -3]],
    scratchWallW: [[-4, 0], [-4, -1]],
    tired: [[-3, -2]],
    sleeping: [[-2, 0], [-2, -1]],
    N: [[-1, -2], [-1, -3]],
    NE: [[0, -2], [0, -3]],
    E: [[-3, 0], [-3, -1]],
    SE: [[-5, -1], [-5, -2]],
    S: [[-6, -3], [-7, -2]],
    SW: [[-5, -3], [-6, -1]],
    W: [[-4, -2], [-4, -3]],
    NW: [[-1, 0], [-1, -1]],
  };

  const setSprite = (name: string, frame: number) => {
    if (!nekoRef.current) return;
    const sprite = spriteSets[name][frame % spriteSets[name].length];
    nekoRef.current.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
  };

  const resetIdleAnimation = () => {
    idleRef.current.animation = null;
    idleRef.current.animationFrame = 0;
  };

  const idle = () => {
    idleRef.current.time += 1;

    if (
      idleRef.current.time > 10 &&
      Math.floor(Math.random() * 200) === 0 &&
      idleRef.current.animation === null
    ) {
      const availableIdleAnimations = ["sleeping", "scratchSelf"];
      if (nekoPosRef.current.x < 32) availableIdleAnimations.push("scratchWallW");
      if (nekoPosRef.current.y < 32) availableIdleAnimations.push("scratchWallN");
      if (nekoPosRef.current.x > window.innerWidth - 32) availableIdleAnimations.push("scratchWallE");
      if (nekoPosRef.current.y > window.innerHeight - 32) availableIdleAnimations.push("scratchWallS");
      
      idleRef.current.animation = availableIdleAnimations[
        Math.floor(Math.random() * availableIdleAnimations.length)
      ];
    }

    switch (idleRef.current.animation) {
      case "sleeping":
        if (idleRef.current.animationFrame < 8) {
          setSprite("tired", 0);
          break;
        }
        setSprite("sleeping", Math.floor(idleRef.current.animationFrame / 4));
        if (idleRef.current.animationFrame > 192) {
          resetIdleAnimation();
        }
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        setSprite(idleRef.current.animation, idleRef.current.animationFrame);
        if (idleRef.current.animationFrame > 9) {
          resetIdleAnimation();
        }
        break;
      default:
        setSprite("idle", 0);
        return;
    }
    idleRef.current.animationFrame += 1;
  };

  const frame = () => {
    if (!nekoRef.current) return;
    
    frameRef.current += 1;
    
    // Use targetPosition if available, otherwise use mouse position
    const targetX = targetPosition?.x ?? mousePosRef.current.x;
    const targetY = targetPosition?.y ?? mousePosRef.current.y;
    
    const diffX = nekoPosRef.current.x - targetX;
    const diffY = nekoPosRef.current.y - targetY;
    const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

    const nekoSpeed = 10; // Slower speed when moving to target

    if (distance < nekoSpeed || distance < 48) {
      idle();
      return;
    }

    idleRef.current.animation = null;
    idleRef.current.animationFrame = 0;

    if (idleRef.current.time > 1) {
      setSprite("alert", 0);
      idleRef.current.time = Math.min(idleRef.current.time, 7);
      idleRef.current.time -= 1;
      return;
    }

    let direction = "";
    direction += diffY / distance > 0.5 ? "N" : "";
    direction += diffY / distance < -0.5 ? "S" : "";
    direction += diffX / distance > 0.5 ? "W" : "";
    direction += diffX / distance < -0.5 ? "E" : "";
    setSprite(direction, frameRef.current);

    nekoPosRef.current.x -= (diffX / distance) * nekoSpeed;
    nekoPosRef.current.y -= (diffY / distance) * nekoSpeed;

    nekoPosRef.current.x = Math.min(Math.max(16, nekoPosRef.current.x), window.innerWidth - 16);
    nekoPosRef.current.y = Math.min(Math.max(16, nekoPosRef.current.y), window.innerHeight - 16);

    nekoRef.current.style.left = `${nekoPosRef.current.x - 16}px`;
    nekoRef.current.style.top = `${nekoPosRef.current.y - 16}px`;
  };

  useEffect(() => {
    const isReducedMotion =
      window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;

    if (isReducedMotion) return;

    const handleMouseMove = (event: MouseEvent) => {
      // Only update mouse position if there's no target
      if (!targetPosition) {
        mousePosRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      }
    };

    const onAnimationFrame = (timestamp: number) => {
      if (!nekoRef.current) return;
      
      if (!lastFrameTimestampRef.current) {
        lastFrameTimestampRef.current = timestamp;
      }
      
      if (timestamp - lastFrameTimestampRef.current > 100) {
        lastFrameTimestampRef.current = timestamp;
        frame();
      }
      
      window.requestAnimationFrame(onAnimationFrame);
    };

    document.addEventListener("mousemove", handleMouseMove);
    window.requestAnimationFrame(onAnimationFrame);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [targetPosition]);

  // Update mousePosRef when targetPosition changes
  useEffect(() => {
    if (targetPosition) {
      console.log('Oneko received target position:', targetPosition);
      mousePosRef.current = {
        x: targetPosition.x,
        y: targetPosition.y,
      };
    }
  }, [targetPosition]);

  return (
    <div
      ref={nekoRef}
      aria-hidden="true"
      style={{
        width: '32px',
        height: '32px',
        position: 'fixed',
        pointerEvents: 'none',
        imageRendering: 'pixelated',
        left: `${nekoPosRef.current.x - 16}px`,
        top: `${nekoPosRef.current.y - 16}px`,
        zIndex: 2147483647,
        backgroundImage: `url(${catImage})`,
      }}
    />
  );
};

export default Oneko;