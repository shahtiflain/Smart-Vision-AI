import { useState, useRef, useEffect, useCallback } from 'react';

export function useCamera() {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const videoRef = useCallback((node: HTMLVideoElement | null) => {
    setVideoEl(node);
  }, []);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (videoEl && stream) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
        videoEl.play().catch((e) => console.error('Video play error:', e));
      }
    }
  }, [videoEl, stream]);

  useEffect(() => {
    let active = true;
    let localStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported by this browser. Try accessing via HTTPS.');
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStream = mediaStream;
        setStream(mediaStream);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow permissions.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError(err.message || 'Error accessing camera.');
        }
      }
    };

    startCamera();

    return () => {
      active = false;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (videoEl) {
        videoEl.srcObject = null;
      }
    };
  }, [videoEl]);

  useEffect(() => {
    if (!videoEl) return;

    const handleReady = () => {
      if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
        setIsReady(true);
      }
    };

    videoEl.addEventListener('loadedmetadata', handleReady);
    videoEl.addEventListener('playing', handleReady);

    return () => {
      videoEl.removeEventListener('loadedmetadata', handleReady);
      videoEl.removeEventListener('playing', handleReady);
    };
  }, [videoEl, stream]);

  const captureFrame = useCallback((maxSize: number = 1024): string | null => {
    if (!videoEl) {
      console.error('captureFrame failed: videoEl is null');
      return null;
    }
    
    const video = videoEl;
    
    if (video.readyState < 2) {
      console.error(`captureFrame failed: video.readyState is ${video.readyState} (needs >= 2)`);
      return null;
    }
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error(`captureFrame failed: dimensions are 0x0`);
      return null;
    }
    if (!stream || !stream.active) {
      console.error(`captureFrame failed: stream is ${stream ? 'inactive' : 'null'}`);
      return null;
    }

    const canvas = document.createElement('canvas');
    let width = video.videoWidth;
    let height = video.videoHeight;
    
    console.log(`captureFrame: original dimensions ${width}x${height}`);

    // Downscale to maxSize
    if (width > height) {
      if (width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
    }
    
    console.log(`captureFrame: downscaled to ${width}x${height}`);

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('captureFrame failed: no 2d context');
      return null;
    }

    ctx.drawImage(video, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', 0.8);
  }, [stream, videoEl]);

  return { videoRef, error, isReady, captureFrame };
}
