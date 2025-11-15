// src/components/Games.js
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Modal, Text, TouchableOpacity, Dimensions, PanResponder, StatusBar } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer, THREE } from 'expo-three';
import { Audio } from 'expo-av';
import { db, auth } from '../firebaseConfig';
import { doc, setDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';

const { width, height } = Dimensions.get('window');
const LANDSCAPE_WIDTH = Math.max(width, height);
const LANDSCAPE_HEIGHT = Math.min(width, height);

// Simple state management
const useGameStore = (set, get) => ({
  // Game state
  level: 1,
  phase: 'A',
  score: 0,
  remoteScore: 0,
  connectPercent: 100,
  timeRemaining: 60,
  isPaused: false,
  isGameOver: false,
  
  // Player state
  position: [0, 1, 0],
  rotation: [0, 0, 0],
  velocity: [0, 0, 0],
  isGrounded: true,
  
  // Remote player state
  remotePosition: [2, 1, 0],
  remoteRotation: [0, 0, 0],
  
  // Settings
  musicVolume: 0.5,
  sfxVolume: 0.7,
  graphicsQuality: 'medium',
  controlSensitivity: 1.0,
  musicEnabled: true,
  sfxEnabled: true,
  
  // Multiplayer
  pairId: null,
  sessionId: null,
  remoteConnected: false,
  
  // Actions
  setLevel: (level) => set({ level }),
  setPhase: (phase) => set({ phase }),
  setScore: (score) => set({ score }),
  setRemoteScore: (remoteScore) => set({ remoteScore }),
  setConnectPercent: (connectPercent) => set({ connectPercent }),
  setTimeRemaining: (timeRemaining) => set({ timeRemaining }),
  setPaused: (isPaused) => set({ isPaused }),
  setGameOver: (isGameOver) => set({ isGameOver }),
  
  setPosition: (position) => set({ position }),
  setRotation: (rotation) => set({ rotation }),
  setVelocity: (velocity) => set({ velocity }),
  setGrounded: (isGrounded) => set({ isGrounded }),
  
  setRemotePosition: (remotePosition) => set({ remotePosition }),
  setRemoteRotation: (remoteRotation) => set({ remoteRotation }),
  setRemoteConnected: (remoteConnected) => set({ remoteConnected }),
  
  updateSettings: (settings) => set(settings),
  setPairId: (pairId) => set({ pairId }),
  setSessionId: (sessionId) => set({ sessionId }),
});

const createStore = (initializer) => {
  let state;
  const listeners = new Set();
  
  const setState = (partial) => {
    const nextState = typeof partial === 'function' ? partial(state) : partial;
    if (nextState !== state) {
      state = { ...state, ...nextState };
      listeners.forEach(listener => listener());
    }
  };
  
  const getState = () => state;
  
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  
  state = initializer(setState, getState);
  
  return { setState, getState, subscribe };
};

const store = createStore(useGameStore);

// Level configurations
const LEVEL_CONFIGS = {
  1: {
    A: { collectibles: 5, time: 60, platforms: 3, hazards: 0 },
    B: { collectibles: 8, time: 45, platforms: 5, hazards: 1 },
    C: { collectibles: 10, time: 30, platforms: 7, hazards: 2 }
  },
  2: {
    A: { collectibles: 7, time: 55, platforms: 4, hazards: 1 },
    B: { collectibles: 10, time: 40, platforms: 6, hazards: 2 },
    C: { collectibles: 12, time: 35, platforms: 8, hazards: 3 }
  },
  3: {
    A: { collectibles: 9, time: 50, platforms: 5, hazards: 2 },
    B: { collectibles: 12, time: 35, platforms: 7, hazards: 3 },
    C: { collectibles: 15, time: 30, platforms: 9, hazards: 4 }
  },
  4: {
    A: { collectibles: 11, time: 45, platforms: 6, hazards: 3 },
    B: { collectibles: 14, time: 30, platforms: 8, hazards: 4 },
    C: { collectibles: 17, time: 25, platforms: 10, hazards: 5 }
  },
  5: {
    A: { collectibles: 13, time: 40, platforms: 7, hazards: 4 },
    B: { collectibles: 16, time: 25, platforms: 9, hazards: 5 },
    C: { collectibles: 19, time: 20, platforms: 11, hazards: 6 }
  },
  6: {
    A: { collectibles: 15, time: 35, platforms: 8, hazards: 5 },
    B: { collectibles: 18, time: 20, platforms: 10, hazards: 6 },
    C: { collectibles: 21, time: 15, platforms: 12, hazards: 7 }
  },
  7: {
    A: { collectibles: 17, time: 30, platforms: 9, hazards: 6 },
    B: { collectibles: 20, time: 15, platforms: 11, hazards: 7 },
    C: { collectibles: 23, time: 10, platforms: 13, hazards: 8 }
  },
  8: {
    A: { collectibles: 19, time: 25, platforms: 10, hazards: 7 },
    B: { collectibles: 22, time: 10, platforms: 12, hazards: 8 },
    C: { collectibles: 25, time: 8, platforms: 14, hazards: 9 }
  },
  9: {
    A: { collectibles: 21, time: 20, platforms: 11, hazards: 8 },
    B: { collectibles: 24, time: 8, platforms: 13, hazards: 9 },
    C: { collectibles: 27, time: 6, platforms: 15, hazards: 10 }
  },
  10: {
    A: { collectibles: 25, time: 15, platforms: 12, hazards: 9 },
    B: { collectibles: 30, time: 6, platforms: 14, hazards: 10 },
    C: { collectibles: 35, time: 4, platforms: 16, hazards: 12 }
  }
};

// Audio manager with fallback for missing assets
class AudioManager {
  constructor() {
    this.sounds = {};
    this.backgroundMusic = null;
    this.isMusicLoaded = false;
  }

  async loadSounds() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });

      console.log('Audio mode set successfully');

    } catch (error) {
      console.log('Error setting audio mode:', error);
    }
  }

  async playSound(soundName, volume = 1.0) {
    const state = store.getState();
    if (!state.sfxEnabled || volume === 0) return;

    try {
      // Create sound on the fly since we don't have asset files
      const sound = new Audio.Sound();
      await sound.loadAsync({
        uri: 'https://www.soundjay.com/button/beep-07.wav' // Fallback online sound
      });
      await sound.setVolumeAsync(volume * state.sfxVolume);
      await sound.playAsync();
      
      // Unload after playing to avoid memory issues
      setTimeout(() => {
        sound.unloadAsync();
      }, 1000);
      
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  }

  async toggleMusic() {
    const state = store.getState();
    if (!state.musicEnabled && this.backgroundMusic) {
      await this.backgroundMusic.stopAsync();
    }
  }
}

const audioManager = new AudioManager();

// Game component
const Games = ({ route, navigation }) => {
  const [localState, setLocalState] = useState(store.getState());
  const [showSettings, setShowSettings] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  
  const glRef = useRef();
  const animationRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();
  const rendererRef = useRef();
  const localCatRef = useRef();
  const remoteCatRef = useRef();
  const lastUpdateRef = useRef(0);
  const firestoreUpdateRef = useRef(0);
  
  const unsubscribeRef = useRef();
  
  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setLocalState(store.getState());
    });
    return unsubscribe;
  }, []);
  
  // Initialize pairId from route params
  useEffect(() => {
    const pairId = route.params?.pairId;
    if (pairId) {
      store.setState({ pairId });
      initializeMultiplayer(pairId);
    } else {
      setShowConnectModal(true);
    }
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [route.params]);
  
  // Initialize multiplayer session
  const initializeMultiplayer = async (pairId) => {
    try {
      const sessionId = `session_${Date.now()}`;
      store.setState({ sessionId });
      
      const sessionRef = doc(db, 'pairs', pairId, 'games', sessionId);
      
      // Initial session data
      await setDoc(sessionRef, {
        players: {
          [auth.currentUser.uid]: {
            position: [0, 1, 0],
            rotation: [0, 0, 0],
            score: 0,
            level: 1,
            phase: 'A',
            lastUpdate: serverTimestamp()
          }
        },
        connectPercent: 100,
        createdAt: serverTimestamp()
      });
      
      // Listen for remote updates
      unsubscribeRef.current = onSnapshot(sessionRef, (doc) => {
        const data = doc.data();
        if (data && data.players) {
          const otherPlayerId = Object.keys(data.players).find(id => id !== auth.currentUser.uid);
          if (otherPlayerId) {
            const remotePlayer = data.players[otherPlayerId];
            store.setState({
              remotePosition: remotePlayer.position || [2, 1, 0],
              remoteRotation: remotePlayer.rotation || [0, 0, 0],
              remoteScore: remotePlayer.score || 0,
              remoteConnected: true,
              connectPercent: data.connectPercent || 100
            });
          }
        }
      });
      
    } catch (error) {
      console.log('Multiplayer init error:', error);
    }
  };
  
  // Update Firestore with local state
  const updateFirestore = async () => {
    const state = store.getState();
    if (!state.pairId || !state.sessionId || Date.now() - firestoreUpdateRef.current < 100) return;
    
    try {
      const sessionRef = doc(db, 'pairs', state.pairId, 'games', state.sessionId);
      await updateDoc(sessionRef, {
        [`players.${auth.currentUser.uid}`]: {
          position: state.position,
          rotation: state.rotation,
          score: state.score,
          level: state.level,
          phase: state.phase,
          lastUpdate: serverTimestamp()
        },
        connectPercent: state.connectPercent
      });
      
      firestoreUpdateRef.current = Date.now();
    } catch (error) {
      console.log('Firestore update error:', error);
    }
  };
  
  // Initialize 3D scene
  const onContextCreate = async (gl) => {
    glRef.current = gl;
    
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const sceneColor = 0x6ab7ff;
    
    // Create renderer
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor(sceneColor);
    rendererRef.current = renderer;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    scene.add(directionalLight);
    
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x3d9970 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
    // Create local cat (orange)
    const localCat = createCatMesh(0xffa500);
    localCat.position.set(0, 1, 0);
    scene.add(localCat);
    localCatRef.current = localCat;
    
    // Create remote cat (gray)
    const remoteCat = createCatMesh(0x888888);
    remoteCat.position.set(2, 1, 0);
    scene.add(remoteCat);
    remoteCatRef.current = remoteCat;
    
    // Create some platforms for level 1
    createLevelPlatforms(scene, 1, 'A');
    
    // Start game loop
    const gameLoop = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const now = Date.now();
      const delta = Math.min(now - lastUpdateRef.current, 100) / 1000;
      lastUpdateRef.current = now;
      
      updateGameState(delta);
      update3DScene();
      updateFirestore();
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      gl.endFrameEXP();
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    lastUpdateRef.current = Date.now();
    gameLoop();
    
    // Load audio
    await audioManager.loadSounds();
  };
  
  // Create simple cat mesh from basic geometries
  const createCatMesh = (color) => {
    const group = new THREE.Group();
    
    // Body (sphere)
    const bodyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);
    
    // Head (smaller sphere)
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ color });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.7;
    group.add(head);
    
    // Ears (cones)
    const earGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const earMaterial = new THREE.MeshLambertMaterial({ color });
    
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-0.2, 0.9, 0);
    leftEar.rotation.x = Math.PI / 6;
    group.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.2, 0.9, 0);
    rightEar.rotation.x = Math.PI / 6;
    group.add(rightEar);
    
    // Tail (cylinder)
    const tailGeometry = new THREE.CylinderGeometry(0.05, 0.1, 0.8, 8);
    const tailMaterial = new THREE.MeshLambertMaterial({ color });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(0, 0.2, -0.6);
    tail.rotation.x = Math.PI / 3;
    group.add(tail);
    
    return group;
  };
  
  // Create platforms for current level/phase
  const createLevelPlatforms = (scene, level, phase) => {
    // Remove existing platforms (except ground and cats)
    scene.children = scene.children.filter(child => 
      child.userData?.isGround || child.type === 'Group' // Keep cats and ground
    );
    
    const config = LEVEL_CONFIGS[level]?.[phase] || LEVEL_CONFIGS[1].A;
    
    // Create platforms based on config
    for (let i = 0; i < config.platforms; i++) {
      const platformGeometry = new THREE.BoxGeometry(2, 0.2, 1);
      const platformMaterial = new THREE.MeshLambertMaterial({ 
        color: Math.random() * 0xffffff 
      });
      const platform = new THREE.Mesh(platformGeometry, platformMaterial);
      
      platform.position.set(
        (Math.random() - 0.5) * 10,
        1 + i * 1.5,
        (Math.random() - 0.5) * 8
      );
      
      platform.userData = { isPlatform: true };
      scene.add(platform);
    }
  };
  
  // Update game state and physics
  const updateGameState = (delta) => {
    if (localState.isPaused) return;
    
    const state = store.getState();
    
    // Apply gravity
    const newVelocity = [...state.velocity];
    if (!state.isGrounded) {
      newVelocity[1] -= 15 * delta; // gravity
    }
    
    // Update position based on velocity
    const newPosition = [
      state.position[0] + newVelocity[0] * delta,
      state.position[1] + newVelocity[1] * delta,
      state.position[2] + newVelocity[2] * delta
    ];
    
    // Simple ground collision
    if (newPosition[1] <= 1) {
      newPosition[1] = 1;
      newVelocity[1] = 0;
      store.setState({ isGrounded: true });
    } else {
      store.setState({ isGrounded: false });
    }
    
    // Update connect percent based on distance between players
    const distance = Math.sqrt(
      Math.pow(state.position[0] - state.remotePosition[0], 2) +
      Math.pow(state.position[2] - state.remotePosition[2], 2)
    );
    
    const newConnectPercent = Math.max(0, 100 - distance * 5);
    store.setState({ connectPercent: newConnectPercent });
    
    // Update timer
    if (state.timeRemaining > 0) {
      store.setState({ timeRemaining: state.timeRemaining - delta });
    } else {
      store.setState({ isGameOver: true });
    }
    
    store.setState({
      position: newPosition,
      velocity: newVelocity
    });
  };
  
  // Update 3D scene with current state
  const update3DScene = () => {
    if (!localCatRef.current || !remoteCatRef.current || !cameraRef.current) return;
    
    const state = store.getState();
    
    // Update local cat
    localCatRef.current.position.set(
      state.position[0],
      state.position[1],
      state.position[2]
    );
    
    // Update remote cat
    remoteCatRef.current.position.set(
      state.remotePosition[0],
      state.remotePosition[1],
      state.remotePosition[2]
    );
    
    // Update camera to follow local cat with offset
    cameraRef.current.position.set(
      state.position[0],
      state.position[1] + 5,
      state.position[2] + 8
    );
    cameraRef.current.lookAt(state.position[0], state.position[1], state.position[2]);
  };
  
  // Player controls
  const handleJump = () => {
    const state = store.getState();
    if (state.isGrounded && !state.isPaused) {
      store.setState({ 
        velocity: [state.velocity[0], 8, state.velocity[2]],
        isGrounded: false
      });
      audioManager.playSound('jump');
    }
  };
  
  const handleDash = () => {
    const state = store.getState();
    if (!state.isPaused) {
      // Dash in the direction the player is facing
      const dashPower = 10;
      store.setState({
        velocity: [state.velocity[0] + dashPower, state.velocity[1], state.velocity[2]]
      });
      audioManager.playSound('dash');
    }
  };
  
  const handleInteract = () => {
    // Interaction logic for collectibles, etc.
    audioManager.playSound('collect');
    
    // Simulate collecting an item
    const state = store.getState();
    const newScore = state.score + 10 * (state.connectPercent / 100);
    store.setState({ score: newScore });
    
    // Check level progression
    const config = LEVEL_CONFIGS[state.level]?.[state.phase];
    if (config && state.score >= config.collectibles * 10) {
      advancePhase();
    }
  };
  
  const advancePhase = () => {
    const state = store.getState();
    const phases = ['A', 'B', 'C'];
    const currentPhaseIndex = phases.indexOf(state.phase);
    
    if (currentPhaseIndex < phases.length - 1) {
      // Move to next phase
      store.setState({ phase: phases[currentPhaseIndex + 1] });
    } else {
      // Move to next level
      if (state.level < 10) {
        store.setState({ 
          level: state.level + 1, 
          phase: 'A',
          score: 0,
          timeRemaining: LEVEL_CONFIGS[state.level + 1].A.time
        });
      } else {
        // Game completed
        store.setState({ isGameOver: true });
      }
    }
    
    // Update 3D scene with new level/platforms
    if (sceneRef.current) {
      createLevelPlatforms(sceneRef.current, store.getState().level, store.getState().phase);
    }
  };
  
  // Joystick control
  const joystickPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      const state = store.getState();
      if (state.isPaused) return;
      
      const sensitivity = state.controlSensitivity * 0.02;
      const newVelocity = [
        gestureState.dx * sensitivity,
        state.velocity[1],
        -gestureState.dy * sensitivity
      ];
      
      store.setState({ velocity: newVelocity });
    },
    onPanResponderRelease: () => {
      store.setState({ velocity: [0, store.getState().velocity[1], 0] });
    }
  });
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);
  
  // Render UI components
  const renderHUD = () => (
    <View style={styles.hud}>
      <View style={styles.topBar}>
        <Text style={styles.hudText}>
          Level {localState.level} - Phase {localState.phase}
        </Text>
        <Text style={styles.hudText}>
          Time: {Math.ceil(localState.timeRemaining)}s
        </Text>
        <TouchableOpacity 
          style={styles.pauseButton}
          onPress={() => store.setState({ isPaused: !localState.isPaused })}
        >
          <Text style={styles.buttonText}>⏸️</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.scores}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>You: {Math.floor(localState.score)}</Text>
        </View>
        <View style={styles.connectContainer}>
          <Text style={styles.connectText}>
            Sync: {Math.floor(localState.connectPercent)}%
          </Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>
            Partner: {Math.floor(localState.remoteScore)}
          </Text>
        </View>
      </View>
      
      {!localState.remoteConnected && (
        <View style={styles.waitingOverlay}>
          <Text style={styles.waitingText}>Waiting for your partner...</Text>
        </View>
      )}
    </View>
  );
  
  const renderControls = () => (
    <View style={styles.controls}>
      {/* Joystick area */}
      <View 
        style={styles.joystickArea}
        {...joystickPanResponder.panHandlers}
      />
      
      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={handleJump}>
          <Text style={styles.buttonText}>Jump</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleDash}>
          <Text style={styles.buttonText}>Dash</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleInteract}>
          <Text style={styles.buttonText}>Interact</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderSettingsModal = () => (
    <Modal visible={showSettings} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Settings</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Music: {localState.musicEnabled ? 'ON' : 'OFF'}</Text>
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => store.setState({ musicEnabled: !localState.musicEnabled })}
            >
              <Text style={styles.buttonText}>Toggle</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingText}>SFX Volume: {Math.round(localState.sfxVolume * 100)}%</Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity 
                style={styles.sliderButton}
                onPress={() => store.setState({ sfxVolume: Math.max(0, localState.sfxVolume - 0.1) })}
              >
                <Text style={styles.buttonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.sliderButton}
                onPress={() => store.setState({ sfxVolume: Math.min(1, localState.sfxVolume + 0.1) })}
              >
                <Text style={styles.buttonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingText}>Graphics: {localState.graphicsQuality}</Text>
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => {
                const qualities = ['low', 'medium', 'high'];
                const currentIndex = qualities.indexOf(localState.graphicsQuality);
                const nextQuality = qualities[(currentIndex + 1) % qualities.length];
                store.setState({ graphicsQuality: nextQuality });
              }}
            >
              <Text style={styles.buttonText}>Change</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowSettings(false)}
          >
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  const renderConnectModal = () => (
    <Modal visible={showConnectModal} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Connect with Partner</Text>
          <Text style={styles.modalText}>
            You need to connect with another player to start the game.
          </Text>
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={() => {
              setShowConnectModal(false);
              navigation.navigate('ConnectScreen');
            }}
          >
            <Text style={styles.buttonText}>Connect Now</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.demoButton}
            onPress={() => {
              setShowConnectModal(false);
              store.setState({ remoteConnected: true }); // Demo mode
            }}
          >
            <Text style={styles.buttonText}>Play Demo (Solo)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  if (showConnectModal) {
    return renderConnectModal();
  }
  
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      />
      
      {renderHUD()}
      {renderControls()}
      {renderSettingsModal()}
      
      {localState.isPaused && !showSettings && (
        <View style={styles.pauseOverlay}>
          <Text style={styles.pauseText}>PAUSED</Text>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.buttonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {localState.isGameOver && (
        <View style={styles.gameOverOverlay}>
          <Text style={styles.gameOverText}>GAME OVER</Text>
          <Text style={styles.finalScoreText}>
            Final Score: {Math.floor(localState.score)}
          </Text>
          <Text style={styles.finalScoreText}>
            Level Reached: {localState.level}
          </Text>
          <TouchableOpacity 
            style={styles.restartButton}
            onPress={() => {
              store.setState({
                level: 1,
                phase: 'A',
                score: 0,
                timeRemaining: 60,
                isGameOver: false,
                position: [0, 1, 0],
                velocity: [0, 0, 0]
              });
            }}
          >
            <Text style={styles.buttonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  glView: {
    flex: 1,
  },
  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  hudText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  pauseButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 5,
  },
  scores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  scoreContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  scoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  connectContainer: {
    backgroundColor: 'rgba(0,100,255,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  connectText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  joystickArea: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  actionButtons: {
    justifyContent: 'space-between',
    height: 120,
  },
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    backgroundColor: '#333',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
  },
  settingText: {
    color: '#fff',
    fontSize: 16,
  },
  toggleButton: {
    backgroundColor: '#666',
    padding: 8,
    borderRadius: 5,
  },
  sliderContainer: {
    flexDirection: 'row',
  },
  sliderButton: {
    backgroundColor: '#666',
    padding: 8,
    marginHorizontal: 5,
    borderRadius: 5,
    minWidth: 30,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#444',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
  },
  connectButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  demoButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  pauseText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  settingsButton: {
    backgroundColor: '#444',
    padding: 15,
    borderRadius: 5,
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  gameOverText: {
    color: '#f00',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  finalScoreText: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 10,
  },
  restartButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
  },
  waitingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -25 }],
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
    borderRadius: 10,
    width: 200,
  },
  waitingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default Games;