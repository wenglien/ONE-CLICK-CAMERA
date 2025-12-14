import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, RotateCcw, Loader2, SwitchCamera, Download, Cpu, Target, Sparkles, ZoomIn, ZoomOut, Palette, Brain, Zap, Maximize2, Minimize2, Sliders, Heart, Move, User, Settings, CheckCircle, Grid3X3, ChevronUp, ChevronDown, ChevronRight, ChevronLeft, MapPin, Share2, Wand2, TrendingUp, TrendingDown, Minus, MessageCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import preferenceService from '../services/preferenceService';
import userProfileService from '../services/userProfileService';
import restaurantService from '../services/restaurantService';
import photoAnalysisService from '../services/photoAnalysisService';
import RestaurantPicker from './RestaurantPicker';

const FOOD_CLASSES = [
  'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog',
  'pizza', 'donut', 'cake', 'bowl', 'cup', 'fork', 'knife', 'spoon',
  'wine glass', 'bottle', 'dining table'
];

const FoodCameraModal = ({ isOpen, onClose, appliedParams, onParamsApplied, onPhotoShared, isEmbedded = false }) => {
  const { t, currentLanguage } = useLanguage();
  const { currentUser, userProfile, updateUserProfile, incrementPhotoCount, recordPhotoLearning, savePhotoToProfile } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const modelRef = useRef(null);
  const detectIntervalRef = useRef(null);
  const trackRef = useRef(null);

  const stateRef = useRef({
    marker: null,
    frameSize: { width: 20, height: 20 },
    filters: { brightness: 100, contrast: 100, saturate: 100, warmth: 0 },
    detectedObject: null,
    zoom: 1,
    manualAdjustments: { brightness: 0, contrast: 0, saturation: 0, warmth: 0 } // Store manual adjustments here
  });

  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const [modelLoading, setModelLoading] = useState(true);
  const [modelReady, setModelReady] = useState(false);

  const [markerPosition, setMarkerPosition] = useState(null);
  const [detectedObject, setDetectedObject] = useState(null);
  const [cameraSettings, setCameraSettings] = useState(null);
  const [photoInfo, setPhotoInfo] = useState(null);

  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1 });
  const [supportsZoom, setSupportsZoom] = useState(false);

  const [selectedMode, setSelectedMode] = useState('normal');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [multiCaptureMode, setMultiCaptureMode] = useState(false);
  const [capturedImages, setCapturedImages] = useState({}); // { modeId: { image, rawImageData, baseFilters, userAdjustments, name, nameEn } }
  const [selectedPhoto, setSelectedPhoto] = useState(null); // For enlarged preview
  const [editingPhotoId, setEditingPhotoId] = useState(null); // For editing a specific multi-capture photo
  const [rawBaseImage, setRawBaseImage] = useState(null); // Raw base image for regeneration
  const [currentContext, setCurrentContext] = useState(null); // Store current context for learning
  const [captureProgress, setCaptureProgress] = useState({ current: 0, total: 0 }); // Progress indicator
  const [showAIPanel, setShowAIPanel] = useState(false); // Toggle AI parameters panel

  const [imagePreviewZoom, setImagePreviewZoom] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showColorAdjustment, setShowColorAdjustment] = useState(false);
  const [manualAdjustments, setManualAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0
  })
  const [capturedAdjustments, setCapturedAdjustments] = useState(null);
  const [rawCapturedImage, setRawCapturedImage] = useState(null);
  const [capturedFilterStr, setCapturedFilterStr] = useState(null);

  const [stabilizationEnabled, setStabilizationEnabled] = useState(true);
  const stabilizationRef = useRef({
    offsetX: 0,
    offsetY: 0,
    smoothX: 0,
    smoothY: 0,
    prevOffsetX: 0,
    prevOffsetY: 0
  });

  const [isPhotoLiked, setIsPhotoLiked] = useState(false);
  const [preferenceApplied, setPreferenceApplied] = useState(false);
  const [suggestedPreference, setSuggestedPreference] = useState(null); // Store suggested preference

  const [showProfileSuggestion, setShowProfileSuggestion] = useState(false);
  const [profileSuggestion, setProfileSuggestion] = useState(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const [showGrid, setShowGrid] = useState(false);
  const showGridRef = useRef(false);

  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);

  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [showRestaurantPicker, setShowRestaurantPicker] = useState(false);
  const [shareToPublic, setShareToPublic] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [shared, setShared] = useState(false);

  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [showModePopup, setShowModePopup] = useState(false);
  const [showAdjustmentsPopup, setShowAdjustmentsPopup] = useState(false);
  const [activeAdjustment, setActiveAdjustment] = useState('brightness');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);

  useEffect(() => {
    showGridRef.current = showGrid;
  }, [showGrid]);

  useEffect(() => {
    if (capturedImage && !analysisResult && !isAnalyzing) {
      const imageToAnalyze = capturedImage;
      
      const runAnalysis = async () => {
        setIsAnalyzing(true);
        
        try {
          const metadata = {
            filters: stateRef.current?.filters ? { ...stateRef.current.filters } : null,
            manualAdjustments: manualAdjustments ? { ...manualAdjustments } : null,
            mode: selectedMode,
            zoom: stateRef.current?.zoom || 1,
          };

          const result = await photoAnalysisService.analyzePhoto(
            imageToAnalyze,
            metadata,
            currentLanguage
          );

          setAnalysisResult(result);
        } catch (error) {
          console.error('AI analysis failed:', error.message);
          const fallback = photoAnalysisService.getDefaultSuggestions(currentLanguage);
          fallback._source = 'error';
          fallback._error = error.message;
          setAnalysisResult(fallback);
        } finally {
          setIsAnalyzing(false);
        }
      };
      
      const timer = setTimeout(runAnalysis, 300);
      return () => clearTimeout(timer);
    }
  }, [capturedImage, analysisResult, isAnalyzing, manualAdjustments, selectedMode, currentLanguage]);

  useEffect(() => {
    if (appliedParams && isOpen && cameraReady) {
      console.log('📍 Applying params from restaurant:', appliedParams);

      if (appliedParams.mode) {
        setSelectedMode(appliedParams.mode);
      }

      const modeParams = preferenceService.getModeParams(appliedParams.mode || selectedMode);
      const baseFilters = { ...modeParams.filters };

      let manualAdj = { brightness: 0, contrast: 0, saturation: 0, warmth: 0 };
      if (appliedParams.manualAdjustments) {
        manualAdj = {
          brightness: appliedParams.manualAdjustments.brightness || 0,
          contrast: appliedParams.manualAdjustments.contrast || 0,
          saturation: appliedParams.manualAdjustments.saturation || 0,
          warmth: appliedParams.manualAdjustments.warmth || 0
        };
        setManualAdjustments(manualAdj);
        stateRef.current.manualAdjustments = manualAdj;
        console.log('📍 Applied manual adjustments:', manualAdj);
      }

      const finalFilters = {
        brightness: baseFilters.brightness + (manualAdj.brightness * 1.5),
        contrast: baseFilters.contrast + (manualAdj.contrast * 1.5),
        saturate: baseFilters.saturate + (manualAdj.saturation * 2),
        warmth: baseFilters.warmth + (manualAdj.warmth * 1.5)
      };

      finalFilters.brightness = Math.max(50, Math.min(200, finalFilters.brightness));
      finalFilters.contrast = Math.max(50, Math.min(200, finalFilters.contrast));
      finalFilters.saturate = Math.max(50, Math.min(300, finalFilters.saturate));
      finalFilters.warmth = Math.max(-75, Math.min(75, finalFilters.warmth));

      stateRef.current.filters = finalFilters;
      console.log('📍 Applied final filters:', finalFilters);

      setPreferenceApplied(true);
      setTimeout(() => setPreferenceApplied(false), 1000);

      if (onParamsApplied) {
        onParamsApplied();
      }
    }
  }, [appliedParams, isOpen, cameraReady, onParamsApplied]);

  const loadModel = useCallback(async () => {
    try {
      setModelLoading(true);
      await tf.ready();
      const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      modelRef.current = model;
      setModelReady(true);
      setModelLoading(false);
    } catch (err) {
      console.error('Model load error:', err);
      setModelLoading(false);
      setError(t('camera.cameraError'));
    }
  }, [t]);

  const initCamera = useCallback(async () => {
    try {
      setError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      setHasMultipleCameras(devices.filter(d => d.kind === 'videoinput').length > 1);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      trackRef.current = videoTrack;

      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.();
        if (capabilities?.zoom) {
          setSupportsZoom(true);
          setZoomRange({
            min: capabilities.zoom.min || 1,
            max: capabilities.zoom.max || 1
          });
          setZoom(capabilities.zoom.min || 1);
          stateRef.current.zoom = capabilities.zoom.min || 1;
        } else {
          setSupportsZoom(false);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();

          stateRef.current = {
            marker: null,
            frameSize: { width: 20, height: 20 },
            filters: { brightness: 100, contrast: 100, saturate: 100, warmth: 0 },
            detectedObject: null,
            zoom: stateRef.current.zoom,
            manualAdjustments: { brightness: 0, contrast: 0, saturation: 0, warmth: 0 }
          };
          setMarkerPosition(null);
          setDetectedObject(null);
          setCameraSettings(null);
          setCameraReady(true);

          let initialMode = selectedMode;

          if (currentUser && userProfile?.preferences?.rememberLastMode && userProfile?.preferences?.favoriteMode) {
            initialMode = userProfile.preferences.favoriteMode;
            setSelectedMode(initialMode);
          }

          const modeParams = preferenceService.getModeParams(initialMode);
          stateRef.current.filters = { ...modeParams.filters };

          if (currentUser && userProfile?.learnedAdjustments && userProfile?.preferences?.autoApplyPreference) {
            const learned = userProfile.learnedAdjustments;
            const adjustments = {
              brightness: Math.round(learned.brightness || 0),
              contrast: Math.round(learned.contrast || 0),
              saturation: Math.round(learned.saturation || 0),
              warmth: Math.round(learned.warmth || 0),
            };
            setManualAdjustments(adjustments);
            stateRef.current.manualAdjustments = adjustments;

            stateRef.current.filters.brightness = 100 + adjustments.brightness;
            stateRef.current.filters.contrast = 100 + adjustments.contrast;
            stateRef.current.filters.saturate = 100 + adjustments.saturation;
            stateRef.current.filters.warmth = adjustments.warmth;

            console.log('☁️ Applied user learned preferences:', adjustments);
          }

          startPreviewLoop();
          startDetectionLoop();
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError(t('camera.cameraError'));
      setCameraReady(false);
    }
  }, [facingMode, t]); // Removed selectedMode to prevent camera re-initialization on mode change

  const handleZoomChange = async (newZoom) => {
    if (!trackRef.current || !supportsZoom) return;

    const clampedZoom = Math.max(zoomRange.min, Math.min(zoomRange.max, newZoom));

    try {
      await trackRef.current.applyConstraints({
        advanced: [{ zoom: clampedZoom }]
      });
      setZoom(clampedZoom);
      stateRef.current.zoom = clampedZoom;
    } catch (err) {
      console.error('Zoom error:', err);
    }
  };

  const zoomPresets = [
    { label: '0.5x', value: 0.5, available: zoomRange.min <= 0.5 },
    { label: '1x', value: 1, available: true },
    { label: '2x', value: 2, available: zoomRange.max >= 2 },
    { label: '3x', value: 3, available: zoomRange.max >= 3 },
    { label: '5x', value: 5, available: zoomRange.max >= 5 }
  ].filter(p => p.available && p.value >= zoomRange.min && p.value <= zoomRange.max);

  const analyzeRegion = useCallback((video, marker, frameSize, objectType) => {
    if (!canvasRef.current || !video || video.readyState < 2) return;
    if (!cameraReady || multiCaptureMode) return; // Don't analyze during capture

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (vw === 0 || vh === 0) return; // Invalid dimensions

    const regionW = (frameSize.width / 100) * vw;
    const regionH = (frameSize.height / 100) * vh;
    const regionX = Math.max(0, (marker.x / 100) * vw - regionW / 2);
    const regionY = Math.max(0, (marker.y / 100) * vh - regionH / 2);

    canvas.width = Math.max(10, regionW);
    canvas.height = Math.max(10, regionH);
    ctx.drawImage(video, regionX, regionY, regionW, regionH, 0, 0, canvas.width, canvas.height);

    const regionData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    let brightness = 0, r = 0, g = 0, b = 0, minB = 255, maxB = 0;
    let totalSaturation = 0, hueDistribution = { warm: 0, cool: 0, neutral: 0 };
    let dominantHue = 0;

    for (let i = 0; i < regionData.length; i += 4) {
      const rb = regionData[i], gb = regionData[i + 1], bb = regionData[i + 2];
      const br = 0.299 * rb + 0.587 * gb + 0.114 * bb;
      brightness += br;
      r += rb; g += gb; b += bb;
      minB = Math.min(minB, br);
      maxB = Math.max(maxB, br);

      const max = Math.max(rb, gb, bb);
      const min = Math.min(rb, gb, bb);
      const saturation = max === 0 ? 0 : (max - min) / max;
      totalSaturation += saturation;

      const avg = (rb + gb + bb) / 3;
      if (rb > avg + 20 || gb > avg + 20) {
        if (rb > gb) hueDistribution.warm++;
        else hueDistribution.cool++;
      } else {
        hueDistribution.neutral++;
      }

      if (rb > gb && rb > bb) dominantHue += 0; // Red
      else if (gb > rb && gb > bb) dominantHue += 120; // Green
      else if (bb > rb && bb > gb) dominantHue += 240; // Blue
      else dominantHue += (rb + gb + bb) / 3;
    }

    const pixels = regionData.length / 4;
    brightness /= pixels;
    r /= pixels; g /= pixels; b /= pixels;
    const avgSaturation = (totalSaturation / pixels) * 100;
    dominantHue /= pixels;

    const isWarmTone = hueDistribution.warm > hueDistribution.cool;
    const isCoolTone = hueDistribution.cool > hueDistribution.warm;
    const colorVibrancy = avgSaturation > 50 ? 'high' : avgSaturation > 30 ? 'medium' : 'low';

    canvas.width = vw / 8;
    canvas.height = vh / 8;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const envData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let envBr = 0;
    for (let i = 0; i < envData.length; i += 4) {
      envBr += 0.299 * envData[i] + 0.587 * envData[i + 1] + 0.114 * envData[i + 2];
    }
    envBr /= (envData.length / 4);

    const baseSettings = generateSettings({
      brightness: Math.round(brightness),
      envBrightness: Math.round(envBr),
      dynamicRange: Math.round(maxB - minB),
      colorTemp: Math.round((r - b) / 255 * 100),
      isBacklit: envBr > brightness + 30,
      isLowLight: envBr < 80,
      objectType,
      saturation: Math.round(avgSaturation),
      isWarmTone,
      isCoolTone,
      colorVibrancy,
      dominantHue: Math.round(dominantHue),
      hueDistribution
    });

    const context = {
      brightness: Math.round(brightness),
      colorTemp: Math.round((r - b) / 255 * 100),
      isBacklit: envBr > brightness + 30,
      isLowLight: envBr < 80,
      objectType,
      saturation: Math.round(avgSaturation),
      isWarmTone,
      isCoolTone,
      colorVibrancy
    };
    setCurrentContext(context);

    const preferenceResult = preferenceService.applyPreference({
      ...context,
      saturation: Math.round(avgSaturation),
      isWarmTone,
      isCoolTone,
      colorVibrancy
    }, baseSettings);

    if (preferenceResult.source === 'user') {
      setSuggestedPreference(preferenceResult);
      setCameraSettings(baseSettings);
      setPreferenceApplied(false);
    } else {
      setSuggestedPreference(null);
      setCameraSettings(preferenceResult.settings);
      setPreferenceApplied(false);
    }

    let filters;

    if (preferenceResult.source === 'user') {
      const modeParams = preferenceService.getModeParams(selectedMode);

      let aiSaturationAdjust = 0;
      let aiWarmthAdjust = 0;

      if (colorVibrancy === 'low') {
        aiSaturationAdjust = 15; // Boost low saturation
      } else if (colorVibrancy === 'high') {
        aiSaturationAdjust = -5; // Slightly reduce oversaturation
      }

      if (isWarmTone && baseSettings.warmth < 20) {
        aiWarmthAdjust = 10; // Enhance warm tones
      } else if (isCoolTone && baseSettings.warmth > -10) {
        aiWarmthAdjust = -15; // Cool down cool tones
      }

      if (dominantHue < 60 || dominantHue > 300) {
        aiWarmthAdjust += 8;
      } else if (dominantHue > 150 && dominantHue < 270) {
        aiWarmthAdjust -= 10;
      }

      filters = {
        brightness: 100 + baseSettings.exposure * 8 + (modeParams.filters.brightness - 100) + stateRef.current.manualAdjustments.brightness,
        contrast: 100 + (baseSettings.contrast - 50) * 0.6 + (modeParams.filters.contrast - 100) + stateRef.current.manualAdjustments.contrast,
        saturate: 100 + (baseSettings.saturation - 50) * 0.8 + (modeParams.filters.saturate - 100) + aiSaturationAdjust + stateRef.current.manualAdjustments.saturation,
        warmth: baseSettings.warmth + modeParams.filters.warmth + aiWarmthAdjust + stateRef.current.manualAdjustments.warmth
      };
    } else if (preferenceResult.filters) {
      const adj = stateRef.current.manualAdjustments;
      filters = {
        brightness: preferenceResult.filters.brightness + (adj.brightness * 1.5),
        contrast: preferenceResult.filters.contrast + (adj.contrast * 1.5),
        saturate: preferenceResult.filters.saturate + (adj.saturation * 2),
        warmth: preferenceResult.filters.warmth + (adj.warmth * 1.5)
      };
    } else {
      const modeParams = preferenceService.getModeParams(selectedMode);

      let aiSaturationAdjust = 0;
      let aiWarmthAdjust = 0;

      if (colorVibrancy === 'low') {
        aiSaturationAdjust = 15; // Boost low saturation
      } else if (colorVibrancy === 'high') {
        aiSaturationAdjust = -5; // Slightly reduce oversaturation
      }

      if (isWarmTone && baseSettings.warmth < 20) {
        aiWarmthAdjust = 10; // Enhance warm tones
      } else if (isCoolTone && baseSettings.warmth > -10) {
        aiWarmthAdjust = -15; // Cool down cool tones
      }

      if (dominantHue < 60 || dominantHue > 300) {
        aiWarmthAdjust += 8;
      } else if (dominantHue > 150 && dominantHue < 270) {
        aiWarmthAdjust -= 10;
      }

      filters = {
        brightness: 100 + baseSettings.exposure * 8 + (modeParams.filters.brightness - 100) + stateRef.current.manualAdjustments.brightness,
        contrast: 100 + (baseSettings.contrast - 50) * 0.6 + (modeParams.filters.contrast - 100) + stateRef.current.manualAdjustments.contrast,
        saturate: 100 + (baseSettings.saturation - 50) * 0.8 + (modeParams.filters.saturate - 100) + aiSaturationAdjust + stateRef.current.manualAdjustments.saturation,
        warmth: baseSettings.warmth + modeParams.filters.warmth + aiWarmthAdjust + stateRef.current.manualAdjustments.warmth
      };
    }

    stateRef.current.filters = filters;
  }, [selectedMode, cameraReady, multiCaptureMode, t]);

  const applyModeFilters = useCallback(() => {
    if (!cameraReady || multiCaptureMode) return;

    const modeParams = preferenceService.getModeParams(selectedMode);
    const baseFilters = modeParams.filters;

    const filters = {
      brightness: baseFilters.brightness + stateRef.current.manualAdjustments.brightness,
      contrast: baseFilters.contrast + stateRef.current.manualAdjustments.contrast,
      saturate: baseFilters.saturate + stateRef.current.manualAdjustments.saturation,
      warmth: baseFilters.warmth + stateRef.current.manualAdjustments.warmth
    };

    filters.brightness = Math.max(50, Math.min(150, filters.brightness));
    filters.contrast = Math.max(50, Math.min(150, filters.contrast));
    filters.saturate = Math.max(50, Math.min(200, filters.saturate));
    filters.warmth = Math.max(-50, Math.min(50, filters.warmth));

    stateRef.current.filters = filters;
  }, [selectedMode, cameraReady, multiCaptureMode]);

  const updateFiltersImmediately = useCallback((adjustmentType, value) => {
    console.log('🔥 updateFiltersImmediately called:', adjustmentType, value);

    stateRef.current.manualAdjustments = {
      ...stateRef.current.manualAdjustments,
      [adjustmentType]: value
    };

    console.log('🎨 Manual adjustment updated:', adjustmentType, value, stateRef.current.manualAdjustments);

    const modeParams = preferenceService.getModeParams(selectedMode);
    const baseFilters = modeParams.filters;
    const adj = stateRef.current.manualAdjustments;

    const filters = {
      brightness: baseFilters.brightness + (adj.brightness * 1.5),
      contrast: baseFilters.contrast + (adj.contrast * 1.5),
      saturate: baseFilters.saturate + (adj.saturation * 2),
      warmth: baseFilters.warmth + (adj.warmth * 1.5)
    };

    filters.brightness = Math.max(50, Math.min(200, filters.brightness));
    filters.contrast = Math.max(50, Math.min(200, filters.contrast));
    filters.saturate = Math.max(50, Math.min(300, filters.saturate));
    filters.warmth = Math.max(-75, Math.min(75, filters.warmth));

    stateRef.current.filters = filters;

    console.log('✅ Filters updated:', stateRef.current.filters);
  }, [selectedMode]);

  const triggerImmediateAnalysis = useCallback(() => {
    if (!cameraReady || !videoRef.current || multiCaptureMode) return;

    const video = videoRef.current;
    if (video.readyState < 2 || video.paused || video.ended) return;

    const state = stateRef.current;

    if (!state.marker || !markerPosition) {
      applyModeFilters();
      return;
    }

    const objectType = state.detectedObject ?
      state.detectedObject.split(' ')[0] : 'unknown';

    analyzeRegion(video, state.marker, state.frameSize, objectType);
  }, [cameraReady, markerPosition, multiCaptureMode, analyzeRegion, applyModeFilters]);

  const startDetectionLoop = useCallback(() => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
    }

    detectIntervalRef.current = setInterval(async () => {
      const state = stateRef.current;
      if (!state.marker || !modelRef.current || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      if (video.paused || video.ended) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      const vw = video.videoWidth;
      const vh = video.videoHeight;

      const detectSize = Math.max(vw, vh) * 0.3;
      const centerX = (state.marker.x / 100) * vw;
      const centerY = (state.marker.y / 100) * vh;

      let cropX = Math.max(0, centerX - detectSize / 2);
      let cropY = Math.max(0, centerY - detectSize / 2);
      let cropW = Math.min(detectSize, vw - cropX);
      let cropH = Math.min(detectSize, vh - cropY);

      canvas.width = cropW;
      canvas.height = cropH;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      try {
        const predictions = await modelRef.current.detect(canvas);

        if (predictions.length > 0) {
          let bestPred = null;
          let bestScore = 0;

          for (const pred of predictions) {
            if (pred.score < 0.35) continue;

            const [bx, by, bw, bh] = pred.bbox;
            const objCenterX = bx + bw / 2;
            const objCenterY = by + bh / 2;
            const distFromCenter = Math.sqrt(
              Math.pow(objCenterX - cropW / 2, 2) +
              Math.pow(objCenterY - cropH / 2, 2)
            );

            const score = pred.score * (1 - distFromCenter / (cropW / 2) * 0.5);
            if (score > bestScore) {
              bestScore = score;
              bestPred = pred;
            }
          }

          if (bestPred) {
            const [bx, by, bw, bh] = bestPred.bbox;

            const objCenterX = ((cropX + bx + bw / 2) / vw) * 100;
            const objCenterY = ((cropY + by + bh / 2) / vh) * 100;
            const objWidth = (bw / vw) * 100 + 5;
            const objHeight = (bh / vh) * 100 + 5;

            state.marker = {
              x: state.marker.x + (objCenterX - state.marker.x) * 0.3,
              y: state.marker.y + (objCenterY - state.marker.y) * 0.3
            };

            state.frameSize = {
              width: state.frameSize.width + (Math.min(50, Math.max(10, objWidth)) - state.frameSize.width) * 0.3,
              height: state.frameSize.height + (Math.min(50, Math.max(10, objHeight)) - state.frameSize.height) * 0.3
            };

            state.detectedObject = `${bestPred.class} (${Math.round(bestPred.score * 100)}%)`;
            setDetectedObject(state.detectedObject);
            setMarkerPosition({ ...state.marker });

            analyzeRegion(video, state.marker, state.frameSize, bestPred.class);
          }
        } else {
          if (state.detectedObject) {
            state.detectedObject = null;
            setDetectedObject(null);
          }
          analyzeRegion(video, state.marker, state.frameSize, 'unknown');
        }
      } catch (e) {
        console.error('Detection error:', e);
      }
    }, 500); // Increased from 250ms to 500ms for better performance
  }, [analyzeRegion]);

  const generateSettings = (analysis) => {
    const {
      brightness, dynamicRange, colorTemp, isBacklit, isLowLight, objectType,
      saturation = 50, isWarmTone = false, isCoolTone = false,
      colorVibrancy = 'medium', dominantHue = 0, hueDistribution = { warm: 0, cool: 0, neutral: 0 }
    } = analysis;

    const settings = {
      exposure: 0, exposureDesc: t('camera.exposureNormal'),
      whiteBalance: t('camera.wbAuto'), whiteBalanceDesc: t('camera.wbNormal'),
      hdr: false, hdrDesc: t('camera.hdrOff'),
      contrast: 55, contrastDesc: t('camera.contrastNormal'),
      saturation: 55, saturationDesc: t('camera.satNormal'),
      warmth: 5, angle: t('camera.angle45'), tips: []
    };

    if (isBacklit) {
      settings.exposure = 1.5;
      settings.exposureDesc = t('camera.exposureBacklit');
    } else if (isLowLight) {
      settings.exposure = 1.2;
      settings.exposureDesc = t('camera.exposureLowLight');
      settings.tips.push(t('camera.tipNightMode'));
    } else if (brightness < 90) {
      settings.exposure = 0.8;
      settings.exposureDesc = t('camera.exposureDark');
    } else if (brightness > 190) {
      settings.exposure = -0.7;
      settings.exposureDesc = t('camera.exposureBright');
    }

    if (colorTemp > 25) {
      settings.whiteBalance = t('camera.wbCloudy');
      settings.whiteBalanceDesc = t('camera.wbWarm');
      settings.warmth = -10;
    } else if (colorTemp < -25) {
      settings.whiteBalance = t('camera.wbTungsten');
      settings.whiteBalanceDesc = t('camera.wbCold');
      settings.warmth = 25;
    } else if (FOOD_CLASSES.includes(objectType)) {
      settings.warmth = 15;
    }

    if (dynamicRange > 180 || isBacklit) {
      settings.hdr = true;
      settings.hdrDesc = t('camera.hdrRecommend');
    }

    if (dynamicRange < 100) {
      settings.contrast = 65;
      settings.contrastDesc = t('camera.contrastIncrease');
    } else if (dynamicRange > 200) {
      settings.contrast = 40;
      settings.contrastDesc = t('camera.contrastDecrease');
    }

    if (['pizza', 'hot dog', 'sandwich', 'cake', 'donut'].includes(objectType)) {
      settings.saturation = 65;
      settings.saturationDesc = t('camera.satFood');
      settings.warmth = Math.max(settings.warmth, 20);
      settings.angle = objectType === 'pizza' ? t('camera.angle90') : t('camera.angle45');
    } else if (['broccoli', 'carrot', 'banana', 'apple', 'orange'].includes(objectType)) {
      settings.saturation = 70;
      settings.saturationDesc = t('camera.satFruit');
    } else if (['cup', 'wine glass', 'bottle'].includes(objectType)) {
      settings.saturation = 45;
      settings.saturationDesc = t('camera.satDrink');
      settings.angle = t('camera.angle15');
    } else if (['bowl'].includes(objectType)) {
      settings.saturation = 60;
      settings.saturationDesc = t('camera.satBowl');
      settings.angle = t('camera.angle60');
    }

    return settings;
  };

  const startPreviewLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = previewCanvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');

    const loop = () => {
      if (!video.paused && !video.ended && video.readyState >= 2) {
        const state = stateRef.current;
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        canvas.width = vw;
        canvas.height = vh;

        const currentFilters = stateRef.current.filters;
        const manualAdj = stateRef.current.manualAdjustments;

        const f = {
          brightness: Math.max(50, Math.min(200,
            (typeof currentFilters.brightness === 'number' ? currentFilters.brightness : 100)
          )),
          contrast: Math.max(50, Math.min(200,
            (typeof currentFilters.contrast === 'number' ? currentFilters.contrast : 100)
          )),
          saturate: Math.max(50, Math.min(300,
            (typeof currentFilters.saturate === 'number' ? currentFilters.saturate : 100)
          )),
          warmth: Math.max(-75, Math.min(75,
            (typeof currentFilters.warmth === 'number' ? currentFilters.warmth : 0)
          ))
        };

        f.brightness = Math.max(50, Math.min(200, f.brightness));
        f.contrast = Math.max(50, Math.min(200, f.contrast));
        f.saturate = Math.max(50, Math.min(300, f.saturate));
        f.warmth = Math.max(-75, Math.min(75, f.warmth));

        let drawX = 0;
        let drawY = 0;
        let drawWidth = vw;
        let drawHeight = vh;

        if (stabilizationEnabled) {
          const stabilizationMargin = 0.05; // 5% on each side
          const cropMargin = Math.min(vw, vh) * stabilizationMargin;

          const smoothingFactor = 0.7; // Higher = more smoothing, less responsive
          const stab = stabilizationRef.current;

          stab.smoothX = stab.smoothX * smoothingFactor + stab.offsetX * (1 - smoothingFactor);
          stab.smoothY = stab.smoothY * smoothingFactor + stab.offsetY * (1 - smoothingFactor);

          drawX = -cropMargin + stab.smoothX;
          drawY = -cropMargin + stab.smoothY;
          drawWidth = vw + cropMargin * 2;
          drawHeight = vh + cropMargin * 2;
        }

        let filterStr = `brightness(${f.brightness / 100}) contrast(${f.contrast / 100}) saturate(${f.saturate / 100})`;
        if (f.warmth > 0) filterStr += ` sepia(${f.warmth * 0.004})`;
        else if (f.warmth < 0) filterStr += ` hue-rotate(${f.warmth * 0.6}deg)`;

        canvas.style.filter = filterStr;

        ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight, 0, 0, vw, vh);

        if (state.marker) {
          const px = (state.marker.x / 100) * vw;
          const py = (state.marker.y / 100) * vh;
          const fw = (state.frameSize.width / 100) * vw;
          const fh = (state.frameSize.height / 100) * vh;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.fillRect(0, 0, vw, py - fh / 2);
          ctx.fillRect(0, py + fh / 2, vw, vh - py - fh / 2);
          ctx.fillRect(0, py - fh / 2, px - fw / 2, fh);
          ctx.fillRect(px + fw / 2, py - fh / 2, vw - px - fw / 2, fh);

          const hasObject = !!state.detectedObject;
          ctx.strokeStyle = hasObject ? '#22c55e' : '#eab308';
          ctx.lineWidth = 3;
          ctx.setLineDash([]);

          const cs = Math.min(30, fw / 5, fh / 5);

          ctx.beginPath();
          ctx.moveTo(px - fw / 2, py - fh / 2 + cs);
          ctx.lineTo(px - fw / 2, py - fh / 2);
          ctx.lineTo(px - fw / 2 + cs, py - fh / 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px + fw / 2 - cs, py - fh / 2);
          ctx.lineTo(px + fw / 2, py - fh / 2);
          ctx.lineTo(px + fw / 2, py - fh / 2 + cs);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px - fw / 2, py + fh / 2 - cs);
          ctx.lineTo(px - fw / 2, py + fh / 2);
          ctx.lineTo(px - fw / 2 + cs, py + fh / 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px + fw / 2 - cs, py + fh / 2);
          ctx.lineTo(px + fw / 2, py + fh / 2);
          ctx.lineTo(px + fw / 2, py + fh / 2 - cs);
          ctx.stroke();

          ctx.strokeStyle = hasObject ? 'rgba(34, 197, 94, 0.6)' : 'rgba(234, 179, 8, 0.6)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(px - 15, py);
          ctx.lineTo(px + 15, py);
          ctx.moveTo(px, py - 15);
          ctx.lineTo(px, py + 15);
          ctx.stroke();

          ctx.fillStyle = hasObject ? '#22c55e' : '#eab308';
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();

          if (state.detectedObject) {
            ctx.font = 'bold 16px sans-serif';
            const text = state.detectedObject;
            const tw = ctx.measureText(text).width;

            ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
            ctx.fillRect(px - tw / 2 - 12, py - fh / 2 - 36, tw + 24, 30);

            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(text, px, py - fh / 2 - 14);
            ctx.textAlign = 'left';
          }
        }

        if (showGridRef.current) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);

          ctx.beginPath();
          ctx.moveTo(vw / 3, 0);
          ctx.lineTo(vw / 3, vh);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo((vw / 3) * 2, 0);
          ctx.lineTo((vw / 3) * 2, vh);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, vh / 3);
          ctx.lineTo(vw, vh / 3);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, (vh / 3) * 2);
          ctx.lineTo(vw, (vh / 3) * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          const intersections = [
            { x: vw / 3, y: vh / 3 },
            { x: (vw / 3) * 2, y: vh / 3 },
            { x: vw / 3, y: (vh / 3) * 2 },
            { x: (vw / 3) * 2, y: (vh / 3) * 2 }
          ];

          for (const point of intersections) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      animationRef.current = requestAnimationFrame(loop);
    };

    loop();
  }, []); // No dependency needed - using ref

  const handleCanvasClick = (e) => {
    if (!cameraReady) return;

    const canvas = previewCanvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    stateRef.current.marker = { x, y };
    stateRef.current.frameSize = { width: 20, height: 20 };
    stateRef.current.detectedObject = null;

    setMarkerPosition({ x, y });
    setDetectedObject(null);
  };

  const clearMarker = () => {
    stateRef.current.marker = null;
    stateRef.current.frameSize = { width: 20, height: 20 };
    stateRef.current.filters = { brightness: 100, contrast: 100, saturate: 100, warmth: 0 };
    stateRef.current.detectedObject = null;

    setMarkerPosition(null);
    setDetectedObject(null);
    setCameraSettings(null);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  useEffect(() => {
    if (isOpen) loadModel();
    return () => { modelRef.current = null; };
  }, [isOpen, loadModel]);

  useEffect(() => {
    if (isOpen && !capturedImage && Object.keys(capturedImages).length === 0 && !multiCaptureMode && modelReady && !modelLoading) {
      initCamera();
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, [isOpen, facingMode, capturedImage, capturedImages, multiCaptureMode, modelReady, modelLoading, initCamera]);

  useEffect(() => {
    if (cameraReady && !multiCaptureMode && !capturedImage) {
      const timeoutId = setTimeout(() => {
        triggerImmediateAnalysis();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedMode, cameraReady, multiCaptureMode, capturedImage, triggerImmediateAnalysis]);

  const capturePhotoWithMode = (modeId = selectedMode, returnRaw = false) => {
    const video = videoRef.current;
    if (!video) return null;

    const width = video.videoWidth;
    const height = video.videoHeight;

    const filtersToUse = { ...stateRef.current.filters };
    const currentManualAdj = { ...stateRef.current.manualAdjustments };

    console.log('📸 Capturing with filters:', filtersToUse);
    console.log('📸 Manual adjustments:', currentManualAdj);

    const f = {
      brightness: typeof filtersToUse.brightness === 'number' ? filtersToUse.brightness : 100,
      contrast: typeof filtersToUse.contrast === 'number' ? filtersToUse.contrast : 100,
      saturate: typeof filtersToUse.saturate === 'number' ? filtersToUse.saturate : 100,
      warmth: typeof filtersToUse.warmth === 'number' ? filtersToUse.warmth : 0
    };

    f.brightness = Math.max(50, Math.min(200, f.brightness));
    f.contrast = Math.max(50, Math.min(200, f.contrast));
    f.saturate = Math.max(50, Math.min(300, f.saturate));
    f.warmth = Math.max(-75, Math.min(75, f.warmth));

    let filterStr = `brightness(${f.brightness / 100}) contrast(${f.contrast / 100}) saturate(${f.saturate / 100})`;
    if (f.warmth > 0) {
      filterStr += ` sepia(${f.warmth * 0.004})`;
    } else if (f.warmth < 0) {
      filterStr += ` hue-rotate(${f.warmth * 0.6}deg)`;
    }

    console.log('📸 Filter string:', filterStr);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    let rawData = null;
    if (returnRaw) {
      ctx.drawImage(video, 0, 0, width, height);
      rawData = canvas.toDataURL('image/jpeg', 1.0);
      ctx.clearRect(0, 0, width, height);
    }

    ctx.filter = filterStr;
    ctx.drawImage(video, 0, 0, width, height);
    ctx.filter = 'none';

    console.log('📸 Photo captured with filters applied');

    const imageData = canvas.toDataURL('image/jpeg', 1.0);

    if (returnRaw) {
      return { raw: rawData, baked: imageData, filterStr };
    }
    return imageData;
  };

  const capturePhoto = () => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const result = capturePhotoWithMode(selectedMode, true);
    if (!result) return;

    const { raw, baked, filterStr } = result;
    const imageData = baked; // Use baked image for saving/downloading logic

    const base64Length = imageData.length - 'data:image/jpeg;base64,'.length;
    const fileSizeMB = ((base64Length * 0.75) / (1024 * 1024)).toFixed(2);

    setCapturedImage(imageData);
    setRawCapturedImage(raw);
    setCapturedFilterStr(filterStr);

    setPhotoInfo({
      width: videoRef.current?.videoWidth || 0,
      height: videoRef.current?.videoHeight || 0,
      size: fileSizeMB,
      format: 'JPEG 100%',
      zoom: stateRef.current.zoom,
      mode: selectedMode
    });

    setIsPhotoLiked(false);
    setPreferenceApplied(false);

    setAnalysisResult(null);
    setShowAnalysisPanel(false);

    setCapturedAdjustments({ ...manualAdjustments });

    if (currentContext && cameraSettings) {
      const modeParams = preferenceService.getModeParams(selectedMode);
      preferenceService.recordPreference(
        currentContext,
        { ...cameraSettings, ...modeParams.settings },
        stateRef.current.filters,
        {
          mode: selectedMode,
          manualAdjustments: { ...manualAdjustments },
          zoom: stateRef.current.zoom,
          isLiked: false // Will be updated if user likes it
        }
      );

      userProfileService.recordPhotoCapture({
        mode: selectedMode,
        filters: stateRef.current.filters,
        manualAdjustments: { ...manualAdjustments },
        context: currentContext,
        isLiked: false,
        zoom: stateRef.current.zoom,
      });

      if (currentUser && recordPhotoLearning) {
        recordPhotoLearning({
          mode: selectedMode,
          filters: { ...stateRef.current.filters },
          manualAdjustments: { ...manualAdjustments },
          context: currentContext,
          zoom: stateRef.current.zoom,
          isLiked: false, // 初始設為未喜歡，之後可更新
        }).then(success => {
          if (success) {
            console.log('🧠 AI Learning: Photo parameters recorded to Firebase');
          }
        }).catch(err => {
          console.warn('⚠️ Failed to record photo learning:', err);
        });
      }
    }

    stateRef.current.marker = null;
    stateRef.current.detectedObject = null;
    setMarkerPosition(null);
    setDetectedObject(null);
    setCameraSettings(null);

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.warn('Error stopping stream:', e);
      }
      streamRef.current = null;
    }

    setCameraReady(false);
  };

  const captureAIVariations = async () => {
    if (!cameraReady || !videoRef.current) return;

    try {
      if (detectIntervalRef.current) {
        clearInterval(detectIntervalRef.current);
        detectIntervalRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      setMultiCaptureMode(true);
      const video = videoRef.current;

      if (!video || video.readyState < 2) {
        throw new Error('Video not ready');
      }

      setCaptureProgress({ current: 0, total: 5 });
      console.log('📸 Starting AI Smart Capture');

      const baseCanvas = document.createElement('canvas');
      const baseCtx = baseCanvas.getContext('2d');
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (!width || !height || width === 0 || height === 0) {
        throw new Error(`Invalid video dimensions (${width}x${height})`);
      }

      baseCanvas.width = width;
      baseCanvas.height = height;
      baseCtx.drawImage(video, 0, 0, width, height);

      const currentFilters = { ...stateRef.current.filters };
      const manualAdj = manualAdjustments;

      const aiBase = {
        brightness: currentFilters.brightness - manualAdj.brightness,
        contrast: currentFilters.contrast - manualAdj.contrast,
        saturate: currentFilters.saturate - manualAdj.saturation,
        warmth: currentFilters.warmth - manualAdj.warmth
      };

      const variations = [
        {
          id: 'natural',
          name: '原色',
          nameEn: 'Natural',
          adjustments: { brightness: 0, contrast: 0, saturate: 0, warmth: 0 }
        },
        {
          id: 'vibrant',
          name: '鮮豔',
          nameEn: 'Vibrant',
          adjustments: { brightness: 5, contrast: 10, saturate: 25, warmth: 15 }
        },
        {
          id: 'cool',
          name: '冷色調',
          nameEn: 'Cool',
          adjustments: { brightness: 0, contrast: 5, saturate: -5, warmth: -20 }
        },
        {
          id: 'soft',
          name: '柔和',
          nameEn: 'Soft',
          adjustments: { brightness: 10, contrast: -15, saturate: -10, warmth: 5 }
        },
        {
          id: 'dramatic',
          name: '戲劇性',
          nameEn: 'Dramatic',
          adjustments: { brightness: -5, contrast: 25, saturate: 15, warmth: 10 }
        }
      ];

      const captured = {};

      for (let i = 0; i < variations.length; i++) {
        setCaptureProgress({ current: i + 1, total: 5 });
        const variation = variations[i];

        try {
          const filters = {
            brightness: aiBase.brightness + variation.adjustments.brightness,
            contrast: aiBase.contrast + variation.adjustments.contrast,
            saturate: aiBase.saturate + variation.adjustments.saturate,
            warmth: aiBase.warmth + variation.adjustments.warmth
          };

          filters.brightness = Math.max(50, Math.min(150, filters.brightness));
          filters.contrast = Math.max(50, Math.min(150, filters.contrast));
          filters.saturate = Math.max(50, Math.min(200, filters.saturate));
          filters.warmth = Math.max(-50, Math.min(50, filters.warmth));

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = width;
          canvas.height = height;

          let filterStr = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)`;
          if (filters.warmth > 0) {
            filterStr += ` sepia(${filters.warmth * 0.4}%)`;
          } else if (filters.warmth < 0) {
            filterStr += ` hue-rotate(${filters.warmth * 0.6}deg)`;
          }

          console.log(`🎨 Generating ${variation.nameEn} with filters:`, filters);

          ctx.drawImage(baseCanvas, 0, 0);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          const brightnessMult = filters.brightness / 100;
          const contrastMult = filters.contrast / 100;
          const saturateMult = filters.saturate / 100;

          for (let px = 0; px < data.length; px += 4) {
            let r = data[px];
            let g = data[px + 1];
            let b = data[px + 2];

            r *= brightnessMult;
            g *= brightnessMult;
            b *= brightnessMult;

            r = ((r / 255 - 0.5) * contrastMult + 0.5) * 255;
            g = ((g / 255 - 0.5) * contrastMult + 0.5) * 255;
            b = ((b / 255 - 0.5) * contrastMult + 0.5) * 255;

            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
            r = gray + (r - gray) * saturateMult;
            g = gray + (g - gray) * saturateMult;
            b = gray + (b - gray) * saturateMult;

            if (filters.warmth > 0) {
              r += filters.warmth * 0.8;
              g += filters.warmth * 0.4;
            } else if (filters.warmth < 0) {
              b -= filters.warmth * 0.8;
              g -= filters.warmth * 0.4;
            }

            data[px] = Math.max(0, Math.min(255, r));
            data[px + 1] = Math.max(0, Math.min(255, g));
            data[px + 2] = Math.max(0, Math.min(255, b));
          }

          ctx.putImageData(imageData, 0, 0);

          const finalImageData = canvas.toDataURL('image/jpeg', 0.95);

          if (finalImageData && finalImageData.length > 100 && finalImageData.startsWith('data:image')) {
            captured[variation.id] = {
              image: finalImageData,
              rawImageData: baseCanvas.toDataURL('image/jpeg', 1.0), // Store raw base image for re-editing
              baseFilters: { ...filters }, // Store the preset filters
              userAdjustments: { brightness: 0, contrast: 0, saturation: 0, warmth: 0 }, // User can adjust these
              name: variation.name,
              nameEn: variation.nameEn
            };
            console.log(`✅ Generated ${variation.nameEn} variation`);
          } else {
            console.warn(`Invalid image data for ${variation.id}`);
          }
        } catch (error) {
          console.error(`❌ Error generating ${variation.id}:`, error);
        }
      }

      setCaptureProgress({ current: 5, total: 5 });
      console.log(`📸 AI Smart Capture complete. Generated ${Object.keys(captured).length} variations`);

      setRawBaseImage(baseCanvas.toDataURL('image/jpeg', 1.0));

      setCapturedImages(captured);
      setMultiCaptureMode(false);
      setCaptureProgress({ current: 0, total: 0 });

      stateRef.current.marker = null;
      stateRef.current.detectedObject = null;
      setMarkerPosition(null);
      setDetectedObject(null);
      setCameraSettings(null);

      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.warn('Error stopping stream:', e);
        }
        streamRef.current = null;
      }

      setCameraReady(false);

    } catch (error) {
      console.error('Error in captureAIVariations:', error);

      if (detectIntervalRef.current) {
        clearInterval(detectIntervalRef.current);
        detectIntervalRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      setMultiCaptureMode(false);
      setCameraReady(false);
      setError(t('camera.analysisError'));
    }
  };

  const downloadPhoto = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!capturedImage) return;

    try {
      const hasAdjustments = manualAdjustments.brightness !== 0 || 
                             manualAdjustments.contrast !== 0 || 
                             manualAdjustments.saturation !== 0 || 
                             manualAdjustments.warmth !== 0;

      if (!hasAdjustments) {
        const link = document.createElement('a');
        link.href = capturedImage;
        link.download = `food-photo-${Date.now()}-${photoInfo?.width || 'unknown'}x${photoInfo?.height || 'unknown'}.jpg`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const brightnessMult = (100 + manualAdjustments.brightness) / 100;
        const contrastMult = (100 + manualAdjustments.contrast) / 100;
        const saturateMult = (100 + manualAdjustments.saturation) / 100;
        const warmth = manualAdjustments.warmth;

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          r *= brightnessMult;
          g *= brightnessMult;
          b *= brightnessMult;

          r = ((r / 255 - 0.5) * contrastMult + 0.5) * 255;
          g = ((g / 255 - 0.5) * contrastMult + 0.5) * 255;
          b = ((b / 255 - 0.5) * contrastMult + 0.5) * 255;

          const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
          r = gray + (r - gray) * saturateMult;
          g = gray + (g - gray) * saturateMult;
          b = gray + (b - gray) * saturateMult;

          if (warmth > 0) {
            r += warmth * 0.8;
            g += warmth * 0.4;
          } else if (warmth < 0) {
            b -= warmth * 0.8;
            g -= warmth * 0.4;
          }

          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
        }

        ctx.putImageData(imageData, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `food-photo-${Date.now()}-${img.width}x${img.height}.jpg`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      img.onerror = () => {
        console.error('Image load error for download');
        const link = document.createElement('a');
        link.href = capturedImage;
        link.download = `food-photo-${Date.now()}.jpg`;
        link.click();
      };
      img.src = capturedImage;
    } catch (error) {
      console.error('Download error:', error);
      window.open(capturedImage, '_blank');
    }
  };

  const downloadPhotoPNG = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!capturedImage) return;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const hasAdjustments = manualAdjustments.brightness !== 0 || 
                               manualAdjustments.contrast !== 0 || 
                               manualAdjustments.saturation !== 0 || 
                               manualAdjustments.warmth !== 0;

        if (hasAdjustments) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          const brightnessMult = (100 + manualAdjustments.brightness) / 100;
          const contrastMult = (100 + manualAdjustments.contrast) / 100;
          const saturateMult = (100 + manualAdjustments.saturation) / 100;
          const warmth = manualAdjustments.warmth;

          for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            r *= brightnessMult;
            g *= brightnessMult;
            b *= brightnessMult;

            r = ((r / 255 - 0.5) * contrastMult + 0.5) * 255;
            g = ((g / 255 - 0.5) * contrastMult + 0.5) * 255;
            b = ((b / 255 - 0.5) * contrastMult + 0.5) * 255;

            const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
            r = gray + (r - gray) * saturateMult;
            g = gray + (g - gray) * saturateMult;
            b = gray + (b - gray) * saturateMult;

            if (warmth > 0) {
              r += warmth * 0.8;
              g += warmth * 0.4;
            } else if (warmth < 0) {
              b -= warmth * 0.8;
              g -= warmth * 0.4;
            }

            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
          }

          ctx.putImageData(imageData, 0, 0);
        }

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `food-photo-${Date.now()}-${img.width}x${img.height}.png`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      img.onerror = () => {
        console.error('Image load error');
        downloadPhoto(e);
      };
      img.src = capturedImage;
    } catch (error) {
      console.error('PNG download error:', error);
      downloadPhoto(e);
    }
  };

  const handleLikePhoto = () => {
    if (!capturedImage) return;

    setIsPhotoLiked(true);

    if (currentContext && cameraSettings) {
      const modeParams = preferenceService.getModeParams(selectedMode);
      preferenceService.recordPreference(
        currentContext,
        { ...cameraSettings, ...modeParams.settings },
        stateRef.current.filters,
        {
          mode: selectedMode,
          manualAdjustments: { ...manualAdjustments },
          zoom: stateRef.current.zoom,
          isLiked: true
        }
      );

      userProfileService.recordPhotoCapture({
        mode: selectedMode,
        filters: stateRef.current.filters,
        manualAdjustments: { ...manualAdjustments },
        context: currentContext,
        isLiked: true,
        zoom: stateRef.current.zoom,
      });
    }

    if (currentUser && updateUserProfile && userProfile) {
      console.log('☁️ Syncing liked photo to cloud...', { currentUser: currentUser.uid, userProfile });

      const currentStats = userProfile.stats || { totalPhotos: 0, likedPhotos: 0, photosThisMonth: 0 };
      const newStats = {
        ...currentStats,
        likedPhotos: (currentStats.likedPhotos || 0) + 1,
      };

      const currentLearned = userProfile.learnedAdjustments || { brightness: 0, contrast: 0, saturation: 0, warmth: 0 };
      const likedCount = (currentStats.likedPhotos || 0) + 1;

      const weight = 3;
      const totalWeight = likedCount * weight;
      const previousWeight = (likedCount - 1) * weight;

      const newLearnedAdjustments = {
        brightness: ((currentLearned.brightness * previousWeight) + (manualAdjustments.brightness * weight)) / totalWeight,
        contrast: ((currentLearned.contrast * previousWeight) + (manualAdjustments.contrast * weight)) / totalWeight,
        saturation: ((currentLearned.saturation * previousWeight) + (manualAdjustments.saturation * weight)) / totalWeight,
        warmth: ((currentLearned.warmth * previousWeight) + (manualAdjustments.warmth * weight)) / totalWeight,
      };

      const aiPatterns = {
        colorTendency: manualAdjustments.warmth > 5 ? 'warm' : manualAdjustments.warmth < -5 ? 'cool' : 'neutral',
        saturationPreference: manualAdjustments.saturation > 10 ? 'high' : manualAdjustments.saturation < -10 ? 'low' : 'normal',
        brightnessPreference: manualAdjustments.brightness > 10 ? 'high' : manualAdjustments.brightness < -10 ? 'low' : 'normal',
        contrastPreference: manualAdjustments.contrast > 10 ? 'high' : manualAdjustments.contrast < -10 ? 'low' : 'normal',
      };

      updateUserProfile({
        stats: newStats,
        learnedAdjustments: newLearnedAdjustments,
        aiPatterns: aiPatterns,
        lastLikedPhotoAt: new Date(),
      }).then(() => {
        console.log('☁️❤️ Liked photo synced to cloud successfully!', newStats);
      }).catch(err => {
        console.error('Failed to sync liked photo to cloud:', err);
      });
    } else {
      console.log('⚠️ Cannot sync - user not logged in or missing data', {
        hasCurrentUser: !!currentUser,
        hasUpdateUserProfile: !!updateUserProfile,
        hasUserProfile: !!userProfile
      });
    }

    console.log('❤️ Photo marked as liked');
  };

  const saveToProfile = async () => {
    if (!currentUser || !capturedImage) {
      console.log('⚠️ Cannot save: no user or no captured image');
      return;
    }

    if (!savePhotoToProfile) {
      console.error('⚠️ savePhotoToProfile function not available');
      return;
    }

    setIsSavingPhoto(true);
    try {
      const result = await savePhotoToProfile({
        imageData: capturedImage,
        mode: selectedMode,
        filters: stateRef.current?.filters ? { ...stateRef.current.filters } : null,
        manualAdjustments: manualAdjustments ? { ...manualAdjustments } : null,
        context: currentContext,
        zoom: stateRef.current?.zoom || 1,
        isLiked: isPhotoLiked,
        photoInfo: photoInfo,
      });

      if (result) {
        setPhotoSaved(true);
        console.log('✅ Photo saved to profile:', result.id);
      }
    } catch (error) {
      console.error('❌ Failed to save photo:', error);
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const shareToRestaurant = async () => {
    if (!currentUser || !selectedRestaurant || !capturedImage) {
      console.log('⚠️ Cannot share: missing requirements');
      return;
    }

    setIsSharing(true);
    try {
      await restaurantService.sharePhotoParams(
        selectedRestaurant.placeId,
        selectedRestaurant,
        {
          mode: selectedMode,
          filters: stateRef.current?.filters ? { ...stateRef.current.filters } : null,
          manualAdjustments: manualAdjustments ? { ...manualAdjustments } : null,
          foodType: currentContext?.objectType || 'unknown',
          lightingCondition: currentContext?.isLowLight ? 'lowLight' : currentContext?.isBacklit ? 'backlit' : 'normal',
          zoom: stateRef.current?.zoom || 1,
        },
        currentUser.uid,
        userProfile?.displayName || 'Anonymous'
      );

      setShared(true);
      console.log('✅ Photo params shared to restaurant:', selectedRestaurant.name);

      if (onPhotoShared) {
        onPhotoShared();
      }
    } catch (error) {
      console.error('❌ Failed to share photo params:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const analyzePhoto = async () => {
    if (!capturedImage) {
      console.log('⚠️ No captured image to analyze');
      return;
    }

    setIsAnalyzing(true);
    setShowAnalysisPanel(true);
    setAnalysisResult(null);

    try {
      console.log('🔍 Starting AI photo analysis...');
      
      const metadata = {
        filters: stateRef.current?.filters ? { ...stateRef.current.filters } : null,
        manualAdjustments: manualAdjustments ? { ...manualAdjustments } : null,
        mode: selectedMode,
        zoom: stateRef.current?.zoom || 1,
      };

      const result = await photoAnalysisService.analyzePhoto(
        capturedImage,
        metadata,
        currentLanguage
      );

      setAnalysisResult(result);
      console.log('✅ AI analysis completed:', result);
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      setAnalysisResult(photoAnalysisService.getDefaultSuggestions(currentLanguage));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzePhotoAuto = async () => {
    if (!capturedImage || isAnalyzing) {
      console.log('⏭️ Skipping auto analysis:', { hasCapturedImage: !!capturedImage, isAnalyzing });
      return;
    }

    setIsAnalyzing(true);

    try {
      const imageId = capturedImage.substring(0, 80);
      console.log('🤖 Auto AI analysis started for image:', imageId);
      
      const metadata = {
        filters: stateRef.current?.filters ? { ...stateRef.current.filters } : null,
        manualAdjustments: manualAdjustments ? { ...manualAdjustments } : null,
        mode: selectedMode,
        zoom: stateRef.current?.zoom || 1,
      };

      const result = await photoAnalysisService.analyzePhoto(
        capturedImage,
        metadata,
        currentLanguage
      );

      setAnalysisResult(result);
      
      if (result._source === 'ai') {
        console.log('✅ Auto AI analysis completed for image:', imageId);
        console.log('✅ Result from: AI Vision API');
        console.log('✅ Analyzed image ID:', result._imageId);
        console.log('✅ Score:', result.overallScore);
      } else {
        console.warn('⚠️ Using FALLBACK result for image:', imageId);
        console.warn('⚠️ Reason:', result._error || 'Unknown error');
      }
    } catch (error) {
      console.error('❌ Auto AI analysis failed:', error);
      const fallback = photoAnalysisService.getDefaultSuggestions(currentLanguage);
      fallback._source = 'error';
      fallback._error = error.message;
      setAnalysisResult(fallback);
      console.warn('⚠️ Using FALLBACK due to exception:', error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAISuggestions = () => {
    if (!analysisResult?.colorFeedback) return;

    const adjustments = photoAnalysisService.generateAdjustmentPreset(analysisResult.colorFeedback);
    
    setManualAdjustments(prev => ({
      brightness: (prev?.brightness || 0) + adjustments.brightness,
      contrast: (prev?.contrast || 0) + adjustments.contrast,
      saturation: (prev?.saturation || 0) + adjustments.saturation,
      warmth: (prev?.warmth || 0) + adjustments.warmth,
    }));

    console.log('✅ Applied AI suggestions:', adjustments);
  };

  const updateMultiPhotoAdjustments = useCallback((photoId, adjustmentType, value) => {
    if (!photoId || !capturedImages[photoId]) return;

    const photo = capturedImages[photoId];
    const newUserAdjustments = {
      ...photo.userAdjustments,
      [adjustmentType]: value
    };

    const finalFilters = {
      brightness: photo.baseFilters.brightness + newUserAdjustments.brightness,
      contrast: photo.baseFilters.contrast + newUserAdjustments.contrast,
      saturate: photo.baseFilters.saturate + newUserAdjustments.saturation,
      warmth: photo.baseFilters.warmth + newUserAdjustments.warmth
    };

    finalFilters.brightness = Math.max(50, Math.min(200, finalFilters.brightness));
    finalFilters.contrast = Math.max(50, Math.min(200, finalFilters.contrast));
    finalFilters.saturate = Math.max(50, Math.min(250, finalFilters.saturate));
    finalFilters.warmth = Math.max(-75, Math.min(75, finalFilters.warmth));

    console.log('🎨 Updating photo:', photoId, 'with filters:', finalFilters);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const brightnessMult = finalFilters.brightness / 100;
      const contrastMult = finalFilters.contrast / 100;
      const saturateMult = finalFilters.saturate / 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        r *= brightnessMult;
        g *= brightnessMult;
        b *= brightnessMult;

        r = ((r / 255 - 0.5) * contrastMult + 0.5) * 255;
        g = ((g / 255 - 0.5) * contrastMult + 0.5) * 255;
        b = ((b / 255 - 0.5) * contrastMult + 0.5) * 255;

        const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
        r = gray + (r - gray) * saturateMult;
        g = gray + (g - gray) * saturateMult;
        b = gray + (b - gray) * saturateMult;

        if (finalFilters.warmth > 0) {
          r += finalFilters.warmth * 0.8;
          g += finalFilters.warmth * 0.4;
        } else if (finalFilters.warmth < 0) {
          b -= finalFilters.warmth * 0.8;
          g -= finalFilters.warmth * 0.4;
        }

        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imageData, 0, 0);
      const newImageData = canvas.toDataURL('image/jpeg', 0.95);

      console.log('✅ Image regenerated for:', photoId);

      setCapturedImages(prev => ({
        ...prev,
        [photoId]: {
          ...prev[photoId],
          image: newImageData,
          userAdjustments: newUserAdjustments
        }
      }));

      setSelectedPhoto(prev => {
        if (prev && prev.id === photoId) {
          return {
            ...prev,
            image: newImageData,
            userAdjustments: newUserAdjustments
          };
        }
        return prev;
      });
    };
    img.src = photo.rawImageData;
  }, [capturedImages]);

  const retakePhoto = () => {
    setCapturedImage(null);
    setPhotoInfo(null);
    setCapturedImages({});
    setMultiCaptureMode(false);
    setEditingPhotoId(null);
    setRawBaseImage(null);
    setPreviewScale(1);
    setPreviewPosition({ x: 0, y: 0 });
    const resetValues = { brightness: 0, contrast: 0, saturation: 0, warmth: 0 };
    setManualAdjustments(resetValues);
    stateRef.current.manualAdjustments = resetValues; // Also reset stateRef
    setCapturedAdjustments(null);  // Reset captured adjustments
    setRawCapturedImage(null);     // Reset raw image
    setCapturedFilterStr(null);    // Reset filter string
    setIsPhotoLiked(false);
    setPreferenceApplied(false);
    setPhotoSaved(false);  // 重置儲存狀態
    setIsSavingPhoto(false);
    setShared(false);  // 重置分享狀態
    setSelectedRestaurant(null);  // 重置餐廳選擇
    setAnalysisResult(null);
    setShowAnalysisPanel(false);
    setIsAnalyzing(false);
    clearMarker();
    initCamera();
  };

  const handleClose = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.warn('Error stopping stream:', e);
      }
      streamRef.current = null;
    }

    trackRef.current = null;

    stateRef.current = {
      marker: null,
      frameSize: { width: 20, height: 20 },
      filters: { brightness: 100, contrast: 100, saturate: 100, warmth: 0 },
      detectedObject: null,
      zoom: 1,
      manualAdjustments: { brightness: 0, contrast: 0, saturation: 0, warmth: 0 }
    };

    setCameraReady(false);
    setCapturedImage(null);
    setCapturedImages({});
    setMarkerPosition(null);
    setDetectedObject(null);
    setCameraSettings(null);
    setError(null);
    setZoom(1);
    setZoomRange({ min: 1, max: 1 });
    setSupportsZoom(false);
    setMultiCaptureMode(false);
    setShowModeSelector(false);
    setShowColorAdjustment(false);
    setManualAdjustments({ brightness: 0, contrast: 0, saturation: 0, warmth: 0 });
    setPreviewScale(1);
    setPreviewPosition({ x: 0, y: 0 });
    setIsPhotoLiked(false);
    setPreferenceApplied(false);
    setSuggestedPreference(null);
    setShowProfileSuggestion(false);
    setProfileSuggestion(null);
    setSuggestionDismissed(false);
    setCurrentContext(null);
    setPhotoInfo(null);
    setIsSavingPhoto(false);
    setPhotoSaved(false);
    setAnalysisResult(null);
    setShowAnalysisPanel(false);
    setIsAnalyzing(false);

    onClose();
  };

  const getWarmthText = () => {
    if (!cameraSettings) return '';
    if (cameraSettings.warmth > 0) return t('camera.warmthWarm');
    if (cameraSettings.warmth < 0) return t('camera.warmthCold');
    return t('camera.warmthNeutral');
  };

  const applySuggestedPreference = () => {
    if (!suggestedPreference) return;

    setCameraSettings(suggestedPreference.settings);
    stateRef.current.filters = suggestedPreference.filters;

    if (suggestedPreference.manualAdjustments) {
      setManualAdjustments(suggestedPreference.manualAdjustments);
      stateRef.current.manualAdjustments = suggestedPreference.manualAdjustments;
    }

    setPreferenceApplied(true);
    setSuggestedPreference(null);
  };

  const checkAndShowProfileSuggestion = useCallback(() => {
    if (suggestionDismissed) return; // 如果使用者已經關閉過，不再顯示

    const suggestion = userProfileService.getSuggestedSettings(currentContext);

    if (suggestion && suggestion.confidence >= 40) {
      setProfileSuggestion(suggestion);
      setShowProfileSuggestion(true);
      console.log('💡 Profile suggestion available:', suggestion);
    }
  }, [currentContext, suggestionDismissed]);

  useEffect(() => {
    if (cameraReady && detectedObject && currentContext && !capturedImage && !suggestionDismissed) {
      const timer = setTimeout(() => {
        checkAndShowProfileSuggestion();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [cameraReady, detectedObject, currentContext, capturedImage, suggestionDismissed, checkAndShowProfileSuggestion]);

  const applyProfileSuggestion = () => {
    if (!profileSuggestion) return;

    console.log('✅ Applying profile suggestion:', profileSuggestion);

    if (profileSuggestion.mode) {
      setSelectedMode(profileSuggestion.mode);
    }

    if (profileSuggestion.adjustments) {
      const adjustments = {
        brightness: profileSuggestion.adjustments.brightness || 0,
        contrast: profileSuggestion.adjustments.contrast || 0,
        saturation: profileSuggestion.adjustments.saturation || 0,
        warmth: profileSuggestion.adjustments.warmth || 0,
      };
      setManualAdjustments(adjustments);
      stateRef.current.manualAdjustments = adjustments;

      updateFiltersImmediately('brightness', adjustments.brightness);
    }

    if (profileSuggestion.filters) {
      stateRef.current.filters = { ...profileSuggestion.filters };
    }

    setPreferenceApplied(true);
    setShowProfileSuggestion(false);
    setProfileSuggestion(null);
  };

  const dismissProfileSuggestion = () => {
    setShowProfileSuggestion(false);
    setProfileSuggestion(null);
    setSuggestionDismissed(true); // 記住使用者關閉了，這次不再顯示
  };

  if (!isOpen) return null;

  const wrapperClass = isEmbedded
    ? "fixed inset-0 flex flex-col bg-black" // No tab bar padding needed - parent handles it
    : "fixed inset-0 backdrop-overlay flex items-center justify-center p-0 sm:p-4 z-50";

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50 safe-area-top safe-area-bottom">
      
      <div className="relative flex-1 overflow-hidden bg-black">
        
        
        {Object.keys(capturedImages).length > 0 && !capturedImage ? (
          /* Multi-Capture Results - 5 Mode Photos Grid */
          <div className="relative w-full h-full bg-black flex flex-col">
            
            <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-4 bg-black/90 backdrop-blur-sm border-b border-white/10 safe-area-top">
              <button
                onClick={() => {
                  setCapturedImages({});
                  setRawBaseImage(null);
                  initCamera();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white active:scale-95 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">返回相機</span>
              </button>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <span className="text-white font-bold text-sm">{t('camera.multiCapture') || '多模式拍攝'}</span>
              </div>
              <span className="text-gray-400 text-sm">{Object.keys(capturedImages).length} 張</span>
            </div>

            
            <div className="flex-1 overflow-y-auto pb-32 px-2">
              <div className="grid grid-cols-2 gap-2 p-2">
                {Object.entries(capturedImages).map(([modeId, data]) => (
                  <div 
                    key={modeId} 
                    className="relative aspect-[4/5] rounded-xl overflow-hidden bg-gray-900 border-2 border-white/10 hover:border-purple-500 transition-all cursor-pointer"
                    onClick={() => {
                      setCapturedImage(data.image);
                      setSelectedMode(modeId);
                    }}
                  >
                    <img 
                      src={data.image} 
                      alt={data.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-white text-sm font-medium text-center">
                        {currentLanguage === 'zh-TW' ? data.name : data.nameEn}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = document.createElement('a');
                        link.href = data.image;
                        link.download = `food-${modeId}-${Date.now()}.jpg`;
                        link.click();
                      }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
                    >
                      <Download className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            
            <div 
              className="absolute left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-6 px-4"
              style={{ bottom: isEmbedded ? '80px' : '0px' }}
            >
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    Object.entries(capturedImages).forEach(([modeId, data], index) => {
                      setTimeout(() => {
                        const link = document.createElement('a');
                        link.href = data.image;
                        link.download = `food-${modeId}-${Date.now()}.jpg`;
                        link.click();
                      }, index * 300);
                    });
                  }}
                  className="flex-1 py-3 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">{t('camera.downloadAll') || '下載全部'}</span>
                </button>
                <button
                  onClick={() => {
                    setCapturedImages({});
                    setRawBaseImage(null);
                    initCamera();
                  }}
                  className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">重新拍攝</span>
                </button>
              </div>
            </div>
          </div>
        ) : capturedImage ? (
          /* Single Captured Image Preview */
          <div className="relative w-full h-full bg-black flex flex-col">
            
            <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-black/90 backdrop-blur-sm border-b border-white/10 safe-area-top">
              <button
                onClick={() => {
                  if (Object.keys(capturedImages).length > 0) {
                    setCapturedImage(null);
                    setAnalysisResult(null);
                  } else {
                    retakePhoto();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white active:scale-95 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">{Object.keys(capturedImages).length > 0 ? '返回結果' : '返回相機'}</span>
              </button>
              <button
                onClick={() => setShowAdjustmentsPopup(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white active:scale-95 transition-all"
              >
                <Sliders className="w-5 h-5" />
                <span className="text-sm font-medium">調整</span>
              </button>
            </div>

            
            <div className="flex-1 flex items-center justify-center overflow-hidden pb-64">
              <img
                src={capturedImage}
                alt="Captured"
                className="max-w-full max-h-full object-contain transition-all duration-150"
                style={{
                  filter: `brightness(${100 + manualAdjustments.brightness}%) contrast(${100 + manualAdjustments.contrast}%) saturate(${100 + manualAdjustments.saturation}%)${
                    manualAdjustments.warmth > 0 
                      ? ` sepia(${manualAdjustments.warmth * 0.8}%)` 
                      : manualAdjustments.warmth < 0 
                        ? ` hue-rotate(${manualAdjustments.warmth * 0.6}deg)` 
                        : ''
                  }`
                }}
              />
            </div>

            
            <div 
              className="absolute left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-8 pb-8 px-4"
              style={{ bottom: isEmbedded ? '80px' : '0px' }}
            >
              
              <button
                onClick={analyzePhoto}
                disabled={isAnalyzing}
                className={`w-full mb-3 p-4 rounded-xl flex items-center gap-3 transition-all active:scale-[0.98] ${
                  analysisResult 
                    ? 'bg-purple-500/20 border-2 border-purple-500' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  analysisResult ? 'bg-purple-500' : 'bg-white/20'
                }`}>
                  {isAnalyzing ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Wand2 className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-bold">
                    {isAnalyzing ? 'AI 分析中...' : analysisResult ? '查看 AI 建議' : '✨ AI 拍攝建議'}
                  </p>
                  <p className="text-white/70 text-sm">
                    {isAnalyzing ? '正在分析角度與色調' : analysisResult ? `評分: ${analysisResult.overallScore}/100` : '獲取專業拍攝改進建議'}
                  </p>
                </div>
                {analysisResult && (
                  <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full">
                    <span className="text-white font-bold text-lg">{analysisResult.overallScore}</span>
                    <span className="text-white/70 text-sm">分</span>
                  </div>
                )}
              </button>

              
              <button
                onClick={() => setShowRestaurantPicker(true)}
                className="w-full mb-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl flex items-center gap-3 border border-white/20 active:scale-[0.98] transition-all"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedRestaurant ? 'bg-green-500' : 'bg-gray-700'}`}>
                  <MapPin className={`w-5 h-5 ${selectedRestaurant ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-medium text-sm">
                    {selectedRestaurant ? selectedRestaurant.name : '選擇拍攝地點'}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {selectedRestaurant ? selectedRestaurant.address : '分享參數到餐廳'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLikePhoto}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    isPhotoLiked 
                      ? 'bg-pink-500/20 border border-pink-500' 
                      : 'bg-white/10 border border-white/20'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isPhotoLiked ? 'text-pink-500 fill-pink-500' : 'text-white'}`} />
                  <span className={`text-sm font-medium ${isPhotoLiked ? 'text-pink-500' : 'text-white'}`}>
                    {isPhotoLiked ? '已喜歡' : '喜歡'}
                  </span>
                </button>

                <button
                  onClick={downloadPhoto}
                  className="flex-1 py-3 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5 text-white" />
                  <span className="text-white text-sm font-medium">下載</span>
                </button>

                {selectedRestaurant ? (
                  <button
                    onClick={shareToRestaurant}
                    disabled={isSharing || shared}
                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                      shared 
                        ? 'bg-green-500/20 border border-green-500' 
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    {isSharing ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : shared ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Share2 className="w-5 h-5 text-white" />
                    )}
                    <span className={`text-sm font-medium ${shared ? 'text-green-500' : 'text-white'}`}>
                      {shared ? '已分享' : '分享'}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={saveToProfile}
                    disabled={isSavingPhoto || photoSaved}
                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                      photoSaved 
                        ? 'bg-green-500/20 border border-green-500' 
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    {isSavingPhoto ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : photoSaved ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                    <span className={`text-sm font-medium ${photoSaved ? 'text-green-500' : 'text-white'}`}>
                      {photoSaved ? '已儲存' : '儲存'}
                    </span>
                  </button>
                )}
              </div>

              
              <button
                onClick={retakePhoto}
                className="w-full mt-4 py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400 text-sm font-medium">重新拍攝</span>
              </button>
            </div>
          </div>
        ) : (
          /* Camera Preview */
          <>
            <video ref={videoRef} autoPlay playsInline muted className="hidden" />
            <canvas
              ref={previewCanvasRef}
              className="w-full h-full object-cover"
              onClick={handleCanvasClick}
            />
            <canvas ref={canvasRef} className="hidden" />

            
            {!cameraReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                <Loader2 className="w-10 h-10 text-green-400 animate-spin" />
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                <div className="text-center p-4">
                  <p className="text-white mb-4">{error}</p>
                  <button onClick={initCamera} className="px-4 py-2 bg-green-500 text-white rounded-lg">{t('common.retry')}</button>
                </div>
              </div>
            )}

            
            {multiCaptureMode && captureProgress.total > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
                <div className="text-center p-6 bg-gray-900/90 rounded-2xl backdrop-blur-sm border border-white/10">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        className="text-gray-700"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={226}
                        strokeDashoffset={226 - (226 * captureProgress.current) / captureProgress.total}
                        className="text-purple-500 transition-all duration-300"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-white font-bold text-lg mb-1">
                    {t('camera.capturing') || '拍攝中...'}
                  </p>
                  <p className="text-purple-400 text-sm">
                    {captureProgress.current} / {captureProgress.total}
                  </p>
                </div>
              </div>
            )}

            
            {markerPosition && (
              <div
                className="absolute pointer-events-none border-2 border-yellow-400 w-16 h-16 -ml-8 -mt-8 transition-all duration-200"
                style={{ left: `${markerPosition.x}%`, top: `${markerPosition.y}%` }}
              />
            )}

            
            {supportsZoom && !showAdjustmentsPopup && (
              <div 
                className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 z-20"
                style={{ bottom: isEmbedded ? '180px' : '140px' }}
              >
                <div className="flex items-center gap-1 px-2 py-1.5 bg-black/60 backdrop-blur-sm rounded-full">
                  {zoomPresets.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => handleZoomChange(preset.value)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                        Math.abs(zoom - preset.value) < 0.1 
                          ? 'bg-yellow-500 text-black' 
                          : 'text-white/80 hover:bg-white/20'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      
      {!capturedImage && Object.keys(capturedImages).length === 0 && (
        <div className="absolute top-0 left-0 right-0 z-20 safe-area-top">
          <div className="flex justify-between items-center px-4 pt-3 pb-2">
            
            <button 
              onClick={() => setShowSettingsPopup(true)} 
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/90 hover:bg-black/60 transition-all"
            >
              <Settings className="w-5 h-5" />
            </button>

          
          <div className="flex gap-3">
            <button 
              onClick={() => setShowGrid(!showGrid)} 
              className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${
                showGrid ? 'bg-yellow-500/80 text-black' : 'bg-black/40 text-white/90 hover:bg-black/60'
              }`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button 
              onClick={switchCamera} 
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/90 hover:bg-black/60 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      )}

      
      <div className={`camera-bottom-bar ${isEmbedded ? 'embedded' : ''}`}>
        
        <button className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden border border-white/20">
          {capturedImage ? (
            <img src={capturedImage} className="w-full h-full object-cover" alt="Preview" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <User className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </button>

        
        <div className="flex items-center gap-3">
          
          {!capturedImage && !multiCaptureMode && cameraReady && (
            <button 
              onClick={captureAIVariations}
              className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              title={t('camera.captureAllModes')}
            >
              <Sparkles className="w-7 h-7 text-white" />
            </button>
          )}
          
          
          {!capturedImage ? (
            <button onClick={capturePhoto} className="shutter-button">
              <div className="shutter-button-inner" />
            </button>
          ) : (
            <button onClick={() => {
              setCapturedImage(null);
              setCapturedImages({});
              setAnalysisResult(null);
              setShowAnalysisPanel(false);
              setIsAnalyzing(false);
              initCamera();
            }} className="shutter-button border-red-500">
              <div className="shutter-button-inner bg-red-500 rounded-lg" style={{ transform: 'scale(0.6)' }} />
            </button>
          )}
        </div>

        
        <button
          onClick={() => setShowAdjustmentsPopup(true)}
          className="control-btn"
          style={{ width: 50, height: 50, background: 'rgba(50,50,50,0.5)' }}
        >
          <Sliders className="w-6 h-6" />
        </button>
      </div>

      

      
      {showAdjustmentsPopup && (
        <div
          className="absolute left-0 right-0 z-30 pointer-events-none"
          style={{ bottom: isEmbedded ? '180px' : '120px' }}
        >
          <div className="mx-4 pointer-events-auto">
            
            <div className="flex items-center justify-center gap-2 mb-3">
              {[
                { key: 'brightness', label: '亮度' },
                { key: 'contrast', label: '對比' },
                { key: 'saturation', label: '飽和' },
                { key: 'warmth', label: '色溫' },
              ].map(adj => (
                <button
                  key={adj.key}
                  onClick={() => setActiveAdjustment(adj.key)}
                  className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${
                    activeAdjustment === adj.key
                      ? 'bg-white/30 backdrop-blur-sm'
                      : 'bg-black/20 backdrop-blur-sm opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className="text-white text-xs font-medium">{adj.label}</span>
                  {activeAdjustment === adj.key && (
                    <span className="text-white text-xs font-medium">{manualAdjustments[adj.key]}</span>
                  )}
                </button>
              ))}
              <button
                onClick={() => setShowAdjustmentsPopup(false)}
                className="ml-2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center opacity-70 hover:opacity-100"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            
            <div className="flex items-center gap-3 px-2 py-2 rounded-full bg-black/25 backdrop-blur-sm">
              <span className="text-white/80 text-xs w-8 text-center font-medium">{manualAdjustments[activeAdjustment]}</span>
              <input
                type="range"
                min="-50"
                max="50"
                value={manualAdjustments[activeAdjustment]}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setManualAdjustments(prev => ({ ...prev, [activeAdjustment]: val }));
                  updateFiltersImmediately(activeAdjustment, val);
                }}
                className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                style={{
                  background: `linear-gradient(to right, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.5) ${(manualAdjustments[activeAdjustment] + 50)}%, rgba(255,255,255,0.2) ${(manualAdjustments[activeAdjustment] + 50)}%, rgba(255,255,255,0.2) 100%)`
                }}
              />
              <button
                onClick={() => {
                  setManualAdjustments(prev => ({ ...prev, [activeAdjustment]: 0 }));
                  updateFiltersImmediately(activeAdjustment, 0);
                }}
                className="text-white/60 hover:text-white text-sm"
              >
                ↺
              </button>
            </div>
          </div>
        </div>
      )}

      
      {showSettingsPopup && (
        <div 
          className="absolute inset-0 z-40 flex"
          onClick={() => setShowSettingsPopup(false)}
        >
          
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          
          <div 
            className="relative w-72 max-w-[80%] h-full bg-gray-900/95 backdrop-blur-md safe-area-top safe-area-bottom overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md px-4 py-4 border-b border-white/10">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-bold text-lg">{t('camera.settings')}</h3>
                <button 
                  onClick={() => setShowSettingsPopup(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            
            <div className="p-4 space-y-4">
              
              <div>
                <label className="text-white/60 text-xs uppercase tracking-wider mb-2 block">
                  {t('camera.mode') || '拍攝模式'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(preferenceService.getModes()).map(([modeId, modeData]) => (
                    <button
                      key={modeId}
                      onClick={() => {
                        setSelectedMode(modeId);
                        setShowSettingsPopup(false);
                        triggerImmediateAnalysis();
                      }}
                      className={`p-3 rounded-xl text-center transition-all ${
                        selectedMode === modeId
                          ? 'bg-green-500/20 border-2 border-green-500'
                          : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                      }`}
                    >
                      <div className="text-2xl mb-1">{modeData.icon}</div>
                      <div className={`text-xs font-medium ${selectedMode === modeId ? 'text-green-400' : 'text-white/80'}`}>
                        {currentLanguage === 'zh-TW' ? modeData.name : modeData.nameEn}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              
              <div className="pt-2 border-t border-white/10">
                <label className="text-white/60 text-xs uppercase tracking-wider mb-2 block">
                  {t('camera.quickSettings') || '快速設定'}
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setStabilizationEnabled(!stabilizationEnabled)}
                    className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                      stabilizationEnabled ? 'bg-green-500/20' : 'bg-white/5'
                    }`}
                  >
                    <span className="text-white text-sm">{t('camera.stabilization') || '防手震'}</span>
                    <div className={`w-10 h-6 rounded-full transition-all ${stabilizationEnabled ? 'bg-green-500' : 'bg-gray-600'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${stabilizationEnabled ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'}`} />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {showAnalysisPanel && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col">
          
          <div className="flex items-center justify-between p-4 pt-12 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">AI 拍攝分析</h2>
                <p className="text-gray-400 text-sm">專業改進建議</p>
              </div>
            </div>
            <button
              onClick={() => setShowAnalysisPanel(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          
          <div className="flex-1 overflow-y-auto p-4 pb-32">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Wand2 className="w-10 h-10 text-white" />
                </div>
                <p className="text-white text-xl font-bold mb-2">AI 分析中...</p>
                <p className="text-gray-400">正在分析您的照片角度與色調</p>
                <div className="mt-6 flex gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="space-y-4">
                
                <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-2xl p-5 border border-purple-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium">整體評分</span>
                    <div className="flex items-center gap-2">
                      <span className="text-4xl font-bold text-white">{analysisResult.overallScore}</span>
                      <span className="text-gray-400">/100</span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
                      style={{ width: `${analysisResult.overallScore}%` }}
                    />
                  </div>
                  <p className="text-purple-300 text-sm mt-3 italic">"{analysisResult.encouragement}"</p>
                </div>

                
                <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-bold">📐 拍攝角度</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300"><span className="text-gray-500">目前：</span>{analysisResult.angleFeedback.current}</p>
                    <p className="text-green-400"><span className="text-gray-500">建議：</span>{analysisResult.angleFeedback.suggestion}</p>
                    <p className="text-gray-400 text-xs">{analysisResult.angleFeedback.reason}</p>
                  </div>
                </div>

                
                <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="w-5 h-5 text-yellow-400" />
                    <span className="text-white font-bold">🎨 色調調整建議</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    
                    <div className="bg-gray-900/50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-400 text-xs">亮度</span>
                        <div className="flex items-center gap-1">
                          {analysisResult.colorFeedback.brightness.adjust > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-400" />
                          ) : analysisResult.colorFeedback.brightness.adjust < 0 ? (
                            <TrendingDown className="w-3 h-3 text-red-400" />
                          ) : (
                            <Minus className="w-3 h-3 text-gray-400" />
                          )}
                          <span className={`text-sm font-medium ${
                            analysisResult.colorFeedback.brightness.adjust > 0 ? 'text-green-400' :
                            analysisResult.colorFeedback.brightness.adjust < 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {analysisResult.colorFeedback.brightness.adjust > 0 ? '+' : ''}{analysisResult.colorFeedback.brightness.adjust}%
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-500 text-xs">{analysisResult.colorFeedback.brightness.current}</p>
                    </div>

                    
                    <div className="bg-gray-900/50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-400 text-xs">對比度</span>
                        <div className="flex items-center gap-1">
                          {analysisResult.colorFeedback.contrast.adjust > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-400" />
                          ) : analysisResult.colorFeedback.contrast.adjust < 0 ? (
                            <TrendingDown className="w-3 h-3 text-red-400" />
                          ) : (
                            <Minus className="w-3 h-3 text-gray-400" />
                          )}
                          <span className={`text-sm font-medium ${
                            analysisResult.colorFeedback.contrast.adjust > 0 ? 'text-green-400' :
                            analysisResult.colorFeedback.contrast.adjust < 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {analysisResult.colorFeedback.contrast.adjust > 0 ? '+' : ''}{analysisResult.colorFeedback.contrast.adjust}%
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-500 text-xs">{analysisResult.colorFeedback.contrast.current}</p>
                    </div>

                    
                    <div className="bg-gray-900/50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-400 text-xs">飽和度</span>
                        <div className="flex items-center gap-1">
                          {analysisResult.colorFeedback.saturation.adjust > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-400" />
                          ) : analysisResult.colorFeedback.saturation.adjust < 0 ? (
                            <TrendingDown className="w-3 h-3 text-red-400" />
                          ) : (
                            <Minus className="w-3 h-3 text-gray-400" />
                          )}
                          <span className={`text-sm font-medium ${
                            analysisResult.colorFeedback.saturation.adjust > 0 ? 'text-green-400' :
                            analysisResult.colorFeedback.saturation.adjust < 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {analysisResult.colorFeedback.saturation.adjust > 0 ? '+' : ''}{analysisResult.colorFeedback.saturation.adjust}%
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-500 text-xs">{analysisResult.colorFeedback.saturation.current}</p>
                    </div>

                    
                    <div className="bg-gray-900/50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-400 text-xs">色溫</span>
                        <div className="flex items-center gap-1">
                          {analysisResult.colorFeedback.warmth.adjust > 0 ? (
                            <TrendingUp className="w-3 h-3 text-orange-400" />
                          ) : analysisResult.colorFeedback.warmth.adjust < 0 ? (
                            <TrendingDown className="w-3 h-3 text-blue-400" />
                          ) : (
                            <Minus className="w-3 h-3 text-gray-400" />
                          )}
                          <span className={`text-sm font-medium ${
                            analysisResult.colorFeedback.warmth.adjust > 0 ? 'text-orange-400' :
                            analysisResult.colorFeedback.warmth.adjust < 0 ? 'text-blue-400' : 'text-gray-400'
                          }`}>
                            {analysisResult.colorFeedback.warmth.adjust > 0 ? '+' : ''}{analysisResult.colorFeedback.warmth.adjust}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-500 text-xs">{analysisResult.colorFeedback.warmth.current}</p>
                    </div>
                  </div>
                </div>

                
                <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Grid3X3 className="w-5 h-5 text-green-400" />
                    <span className="text-white font-bold">📷 構圖建議</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300"><span className="text-gray-500">目前：</span>{analysisResult.compositionFeedback.current}</p>
                    <p className="text-green-400"><span className="text-gray-500">建議：</span>{analysisResult.compositionFeedback.suggestion}</p>
                  </div>
                </div>

                
                <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <span className="text-white font-bold">💡 快速提示</span>
                  </div>
                  <div className="space-y-2">
                    {analysisResult.quickTips.map((tip, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-yellow-400 mt-0.5">•</span>
                        <p className="text-gray-300 text-sm">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <MessageCircle className="w-16 h-16 text-gray-600 mb-4" />
                <p className="text-gray-400">點擊分析按鈕獲取 AI 建議</p>
              </div>
            )}
          </div>

          
          {analysisResult && (
            <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-gray-900/95 backdrop-blur-md border-t border-gray-700">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setAnalysisResult(null);
                    analyzePhoto();
                  }}
                  className="flex-1 py-4 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">重新分析</span>
                </button>
                <button
                  onClick={() => {
                    applyAISuggestions();
                    setShowAnalysisPanel(false);
                  }}
                  className="flex-[2] py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center gap-2"
                >
                  <Wand2 className="w-5 h-5 text-white" />
                  <span className="text-white font-bold">套用 AI 建議</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      
      <RestaurantPicker
        isOpen={showRestaurantPicker}
        onClose={() => setShowRestaurantPicker(false)}
        onSelect={(restaurant) => {
          setSelectedRestaurant(restaurant);
          setShowRestaurantPicker(false);
        }}
        onSelectAndShare={async (restaurant) => {
          if (!currentUser || !capturedImage) {
            console.log('⚠️ Cannot share: missing requirements', { currentUser: !!currentUser, capturedImage: !!capturedImage });
            throw new Error('請先登入並拍攝照片');
          }

          console.log('🚀 Starting share to restaurant:', restaurant.name);
          
          try {
            await restaurantService.sharePhotoParams(
              restaurant.placeId,
              restaurant,
              {
                mode: selectedMode,
                filters: stateRef.current?.filters ? { ...stateRef.current.filters } : null,
                manualAdjustments: manualAdjustments ? { ...manualAdjustments } : null,
                foodType: currentContext?.objectType || 'unknown',
                lightingCondition: currentContext?.isLowLight ? 'lowLight' : currentContext?.isBacklit ? 'backlit' : 'normal',
                zoom: stateRef.current?.zoom || 1,
              },
              currentUser.uid,
              userProfile?.displayName || 'Anonymous'
            );

            setSelectedRestaurant(restaurant);
            setShared(true);
            console.log('✅ Photo params shared to restaurant:', restaurant.name);

            if (onPhotoShared) {
              onPhotoShared();
            }
            
            return true; // 表示成功
          } catch (error) {
            console.error('❌ Failed to share photo params:', error);
            throw error; // 重新拋出錯誤讓 RestaurantPicker 處理
          }
        }}
        showShareOption={!!capturedImage && !!currentUser}
        userLocation={null}
      />
    </div>
  );
};

export default FoodCameraModal;
