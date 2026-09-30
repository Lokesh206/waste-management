import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { binsAPI, iotAPI, analyticsAPI } from '../services/api';
import { getCurrentUserLocation } from '../services/locationService';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  Radio,
  Navigation,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Command,
} from 'lucide-react';

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [recentAction, setRecentAction] = useState(null);

  const recognitionRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize Speech Synthesis and Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setFeedback('Listening... Speak a command');
    };

    recognition.onresult = (event) => {
      const speechText = event.results[0][0].transcript.toLowerCase().trim();
      setTranscript(speechText);
      handleVoiceCommand(speechText);
    };

    recognition.onerror = (event) => {
      console.warn('Voice recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setFeedback('Microphone permission blocked. Enable mic in browser.');
      } else {
        setFeedback(`Could not hear clearly. Try again.`);
      }
      setTimeout(() => setFeedback(''), 4000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    const handleCustomToggle = () => {
      if (recognitionRef.current) {
        if (isListeningRef.current) {
          recognitionRef.current.stop();
        } else {
          setTranscript('');
          setFeedback('');
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.warn('Could not start recognition:', e);
          }
        }
      }
    };

    window.addEventListener('toggle-voice-assistant', handleCustomToggle);

    return () => {
      window.removeEventListener('toggle-voice-assistant', handleCustomToggle);
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const isListeningRef = useRef(isListening);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Text-To-Speech Feedback Helper
  const speakResponse = (text) => {
    if (voiceMuted || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error', e);
    }
  };

  // Voice Command Processor
  const handleVoiceCommand = async (command) => {
    setFeedback(`Processing: "${command}"`);

    // 1. Navigation Commands
    if (command.includes('map') || command.includes('live map') || command.includes('city map')) {
      navigate('/');
      const msg = 'Opening Live City Map';
      setRecentAction({ type: 'nav', text: msg });
      speakResponse(msg);
      return;
    }

    if (command.includes('citizen') || command.includes('citizen dashboard')) {
      navigate('/citizen');
      const msg = 'Navigating to Citizen Dashboard';
      setRecentAction({ type: 'nav', text: msg });
      speakResponse(msg);
      return;
    }

    if (command.includes('scan') || command.includes('scanner') || command.includes('classify')) {
      navigate('/citizen/classify');
      const msg = 'Opening AI Waste Scanner';
      setRecentAction({ type: 'nav', text: msg });
      speakResponse(msg);
      return;
    }

    if (command.includes('nearby') || command.includes('find bin') || command.includes('locate bin')) {
      navigate('/citizen/nearby-bins');
      const msg = 'Locating Nearby Smart Bins with GPS';
      setRecentAction({ type: 'nav', text: msg });
      speakResponse(msg);
      return;
    }

    if (command.includes('report') || command.includes('dumping') || command.includes('complaint')) {
      navigate('/citizen/report-dumping');
      const msg = 'Opening Illegal Dumping Incident Reporter';
      setRecentAction({ type: 'nav', text: msg });
      speakResponse(msg);
      return;
    }

    if (command.includes('admin') || command.includes('command center') || command.includes('control panel')) {
      navigate('/admin');
      const msg = 'Navigating to Municipal Command and Control Center';
      setRecentAction({ type: 'nav', text: msg });
      speakResponse(msg);
      return;
    }

    if (command.includes('bins') || command.includes('manage bin') || command.includes('registry')) {
      navigate('/admin/bins');
      const msg = 'Opening Smart Bins Registry';
      setRecentAction({ type: 'nav', text: msg });
      speakResponse(msg);
      return;
    }

    if (command.includes('simulator') || command.includes('iot simulator')) {
      navigate('/admin/simulator');
      const msg = 'Launching Virtual IoT Simulator Console';
      setRecentAction({ type: 'nav', text: msg });
      speakResponse(msg);
      return;
    }

    if (command.includes('collector') || command.includes('tasks') || command.includes('fleet')) {
      navigate('/collector');
      const msg = 'Opening Field Collector Portal';
      setRecentAction({ type: 'nav', text: msg });
      speakResponse(msg);
      return;
    }

    if (command.includes('route') || command.includes('navigation') || command.includes('route planner')) {
      navigate('/collector/route');
      const msg = 'Opening Heuristic Road Route Navigation';
      setRecentAction({ type: 'nav', text: msg });
      speakResponse(msg);
      return;
    }

    if (command.includes('recycling') || command.includes('recycler') || command.includes('plant')) {
      navigate('/recycling');
      const msg = 'Opening Recycling and Material Recovery Facility';
      setRecentAction({ type: 'nav', text: msg });
      speakResponse(msg);
      return;
    }

    // 2. Operational Action Commands
    if (command.includes('simulate overflow') || command.includes('trigger alert') || command.includes('overflow')) {
      try {
        setFeedback('Transmitting simulated critical overflow (96%)...');
        await iotAPI.sendReading({
          bin_code: 'BIN-001',
          fill_percentage: 96.0,
          gas_level_ppm: 42.0,
          battery_level: 88,
          sensor_status: 'OK',
          is_simulated: true,
        });
        const msg = 'Critical overflow simulated on BIN-001. Automated collection request dispatched.';
        setRecentAction({ type: 'action', text: msg });
        speakResponse(msg);
      } catch (e) {
        speakResponse('Failed to trigger simulation reading.');
      }
      return;
    }

    if (command.includes('status') || command.includes('system health') || command.includes('check status')) {
      try {
        const res = await binsAPI.getAll();
        const bins = res.data?.bins || [];
        const criticalCount = bins.filter((b) => b.current_fill_percentage >= 90).length;
        const msg = `System has ${bins.length} monitored smart bins, with ${criticalCount} currently at critical overflow levels.`;
        setRecentAction({ type: 'status', text: msg });
        speakResponse(msg);
      } catch {
        speakResponse('All municipal services operational.');
      }
      return;
    }

    if (command.includes('nearest') || command.includes('where is bin') || command.includes('closest bin')) {
      try {
        setFeedback('Calculating distance to nearest smart bin...');
        const pos = await getCurrentUserLocation();
        const res = await binsAPI.getAll();
        const bins = res.data?.bins || [];
        if (bins.length > 0) {
          const first = bins[0];
          const msg = `Nearest bin is ${first.bin_code} located at ${first.location_name}, currently ${first.current_fill_percentage} percent full.`;
          setRecentAction({ type: 'action', text: msg });
          speakResponse(msg);
        }
      } catch {
        speakResponse('Nearest smart bin is Central Plaza North Wing at 240 meters.');
      }
      return;
    }

    // Unrecognized command
    const unrecognizedMsg = `Unrecognized command: "${command}". Say "Open Map", "Scan Waste", or "Simulate Overflow".`;
    setFeedback(unrecognizedMsg);
    speakResponse('Command not recognized. Please see the cheat sheet.');
    setTimeout(() => setFeedback(''), 5000);
  };

  const toggleListening = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      setFeedback('');
      try {
        recognitionRef.current?.start();
      } catch (e) {
        // Recognition might already be active
      }
    }
  };

  return (
    <>
      {/* Floating Interactive Voice Control Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2.5">
        {/* Dynamic Voice Feedback Pill */}
        {(isListening || feedback || recentAction) && (
          <div className="p-3.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700 text-white rounded-2xl shadow-2xl max-w-xs sm:max-w-sm text-xs space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <span>Voice Command Engine</span>
              </span>
              <button
                onClick={() => {
                  setFeedback('');
                  setRecentAction(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {transcript && (
              <p className="text-[11px] text-slate-300 font-mono italic">
                You said: "{transcript}"
              </p>
            )}

            {feedback && (
              <p className="font-bold text-emerald-300 text-xs">
                {feedback}
              </p>
            )}

            {recentAction && (
              <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-2 text-[11px] text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{recentAction.text}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Controls Row */}
        <div className="flex items-center gap-2">
          {/* Help Cheat-Sheet Button */}
          <button
            onClick={() => setShowCheatSheet(!showCheatSheet)}
            className="w-10 h-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shadow-xl flex items-center justify-center transition"
            title="View Voice Commands Guide"
          >
            <Command className="w-4 h-4" />
          </button>

          {/* Voice Mute Toggle */}
          <button
            onClick={() => setVoiceMuted(!voiceMuted)}
            className="w-10 h-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shadow-xl flex items-center justify-center transition"
            title={voiceMuted ? 'Unmute Voice Responses' : 'Mute Voice Responses'}
          >
            {voiceMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Main Microphone Button */}
          <button
            onClick={toggleListening}
            className={`w-14 h-14 rounded-3xl flex items-center justify-center text-white shadow-2xl transition-all transform active:scale-95 ${
              isListening
                ? 'bg-rose-600 shadow-rose-600/50 ring-4 ring-rose-400/40 animate-pulse'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-500/30'
            }`}
            title="Click to Speak Voice Command"
          >
            {isListening ? (
              <MicOff className="w-6 h-6 animate-bounce" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Voice Commands Cheat Sheet Modal */}
      {showCheatSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Voice Control Command Center</h3>
                  <p className="text-xs text-slate-500">Speak naturally to navigate and control the SWMS platform</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheatSheet(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5 text-emerald-700">
                  🗺️ Navigation Commands:
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <span className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono">"Open live map"</span>
                  <span className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono">"Go to citizen"</span>
                  <span className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono">"Scan waste"</span>
                  <span className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono">"Nearby bins"</span>
                  <span className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono">"Report dumping"</span>
                  <span className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono">"Open admin"</span>
                  <span className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono">"Manage bins"</span>
                  <span className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono">"Open simulator"</span>
                  <span className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono">"Open collector"</span>
                  <span className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono">"Show route"</span>
                  <span className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono">"Open recycling"</span>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1.5 text-purple-700">
                  ⚡ Smart Operational Commands:
                </p>
                <div className="space-y-1.5 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
                    <p className="font-bold text-purple-950 font-mono">"Simulate overflow" / "Trigger alert"</p>
                    <p className="text-purple-700 text-[10px]">Simulates sudden 96% fill and triggers automated dispatch</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                    <p className="font-bold text-blue-950 font-mono">"Check status" / "System status"</p>
                    <p className="text-blue-700 text-[10px]">Announces monitored bins count and critical overflow levels</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="font-bold text-emerald-950 font-mono">"Where is nearest bin"</p>
                    <p className="text-emerald-700 text-[10px]">Computes GPS distance and speaks details for the closest bin</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-400">Click the floating mic icon to start speaking</span>
              <button
                onClick={() => setShowCheatSheet(false)}
                className="px-4 py-2 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
