import { useState, useEffect, useRef } from 'react'
import './App.css'
import { fetchWeatherApi } from 'openmeteo'

function App() {
  const [showNotification, setShowNotification] = useState(true)
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState(null)
  const [selectedFilter, setSelectedFilter] = useState('')
  const [countdown, setCountdown] = useState('')
  const [capturedImage, setCapturedImage] = useState('')
  const [temperature, setTemperature] = useState(null)
  const [aqi, setAqi] = useState(null)
  const [weatherError, setWeatherError] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const filters = [
    { name: 'None', filter: '' },
    { name: 'Sepia', filter: 'sepia(100%)' },
    { name: 'Grayscale', filter: 'grayscale(100%)' },
    { name: 'Blur', filter: 'blur(2px)' },
    { name: 'Brightness', filter: 'brightness(150%)' },
    { name: 'Contrast', filter: 'contrast(150%)' },
  ]

  const getAqiLabel = (aqi) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false)
        setShowCamera(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showNotification])

  useEffect(() => {
    if (showCamera && !stream) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((mediaStream) => {
          setStream(mediaStream)
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream
          }
        })
        .catch((err) => console.error('Error accessing camera:', err))
    }
  }, [showCamera, stream])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const params = {
            latitude: latitude,
            longitude: longitude,
            current: ["temperature_2m"],
          };
          const url = "https://api.open-meteo.com/v1/forecast";
          const responses = await fetchWeatherApi(url, params);
          const response = responses[0];
          const current = response.current();
          const temperatureValue = current.variables(0).value();
          setTemperature(Math.round(temperatureValue));
          // Fetch AQI from WAQI
          const aqiRes = await fetch(`https://api.waqi.info/feed/geo:${latitude};${longitude}/?token=demo`);
          if (aqiRes.ok) {
            const aqiData = await aqiRes.json();
            if (aqiData.status === 'ok') {
              setAqi(aqiData.data.aqi);
            }
          }
          setWeatherError('');
        } catch (error) {
          console.error('Error fetching weather data:', error);
          setWeatherError('Failed to load weather data.');
        }
      }, (error) => {
        console.error('Geolocation error:', error);
        setWeatherError('Location access denied. Enable location for weather.');
      });
    } else {
      setWeatherError('Geolocation not supported.');
    }
  }, [])

  const handleShutter = () => {
    setCountdown('1')
    setTimeout(() => setCountdown('2'), 1000)
    setTimeout(() => setCountdown('3'), 2000)
    setTimeout(() => setCountdown('Smile!'), 3000)
    setTimeout(() => {
      capturePhoto()
      setCountdown('')
    }, 4000)
  }

  const capturePhoto = () => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (canvas && video) {
      const ctx = canvas.getContext('2d')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.filter = selectedFilter
      ctx.drawImage(video, 0, 0)
      const dataURL = canvas.toDataURL('image/png')
      setCapturedImage(dataURL)
    }
  }

  if (showNotification) {
    return (
      <div className="notification">
        <h1>Hey Beautiful! ❤️</h1>
      </div>
    )
  }

  if (capturedImage) {
    return (
      <div className="captured">
        <h1>Smile Captured!</h1>
        <img src={capturedImage} alt="Captured" />
        <div className="buttons">
          <button onClick={() => {
            const link = document.createElement('a')
            link.href = capturedImage
            link.download = 'smile-photo.png'
            link.click()
          }}>Save Photo</button>
          <button onClick={() => {
            setCapturedImage('')
            setCountdown('')
            if (stream) {
              stream.getTracks().forEach(track => track.stop())
              setStream(null)
            }
          }}>Take Another</button>
        </div>
      </div>
    )
  }

  return (
    <div className="camera-app">
      <h1>Smile Camera</h1>
      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ filter: selectedFilter }}
          className="video"
        />
        {countdown && <div className="countdown">{countdown}</div>}
        {/* Overlay AQI and Temp */}
        <div className="overlay-info">
          <span className="overlay-aqi">💨 AQI: {getAqiLabel(aqi)}</span>
          <span className="overlay-temp">🌥️ TEMP: {temperature}°C</span>
        </div>
      </div>
      <h2>Capture Your Smile with some filters.</h2>
      <div className="filters">
        {filters.map((filter) => (
          <button
            key={filter.name}
            onClick={() => setSelectedFilter(filter.filter)}
            className={selectedFilter === filter.filter ? 'active' : ''}
          >
            {filter.name}
          </button>
        ))}
      </div>
      <button className="shutter" onClick={handleShutter} disabled={!!countdown}>
        📷 Shutter
      </button>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default App
