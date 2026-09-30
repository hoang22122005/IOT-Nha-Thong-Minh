import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

const panelStyle = { padding: 24 };
const buttonStyle = { minWidth: 170, justifyContent: 'center' };

function normalizeVietnamese(text) {
  return text
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

export default function VoiceCommandPanel({ selectedDeviceId, supportedActuators = [], sendLightCommand, sendBuzzerCommand }) {
  const recognitionRef = useRef(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => recognitionRef.current?.stop();
  }, []);

  const runCommand = async (spokenText) => {
    const phrase = normalizeVietnamese(spokenText);
    if ((phrase.includes('den') && !supportedActuators.includes('LED'))
        || (phrase.includes('coi') && !supportedActuators.includes('BUZZER'))) {
      setError('Node này không có thiết bị điều khiển tương ứng.');
      return;
    }
    let accepted = false;
    let commandLabel = '';

    if (phrase.includes('bat den')) {
      const color = phrase.includes('do') ? [255, 0, 0]
        : phrase.includes('xanh duong') ? [0, 0, 255]
          : phrase.includes('xanh la') ? [0, 255, 0] : [0, 80, 0];
      accepted = await sendLightCommand('ON', ...color);
      commandLabel = 'bật LED';
    } else if (phrase.includes('tat den')) {
      accepted = await sendLightCommand('OFF');
      commandLabel = 'tắt LED';
    } else if (phrase.includes('bat coi')) {
      accepted = await sendBuzzerCommand('ON');
      commandLabel = 'bật còi';
    } else if (phrase.includes('tat coi')) {
      accepted = await sendBuzzerCommand('OFF');
      commandLabel = 'tắt còi';
    } else {
      setError('Chưa hiểu câu lệnh. Hãy nói “bật đèn”, “tắt đèn”, “bật còi” hoặc “tắt còi”.');
      return;
    }

    if (accepted) {
      setError('');
      setMessage(`Backend đã nhận lệnh ${commandLabel} cho ${selectedDeviceId}. Chờ trạng thái thật quay về qua MQTT.`);
    } else {
      setMessage('Backend chưa nhận được lệnh. Kiểm tra backend và trạng thái kết nối MQTT của node.');
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Hãy thử Chrome hoặc Edge.');
      return;
    }

    setError('');
    setMessage('');
    setTranscript('');
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onresult = async (event) => {
      const spokenText = event.results?.[0]?.[0]?.transcript || '';
      setTranscript(spokenText);
      await runCommand(spokenText);
    };
    recognition.onerror = (event) => {
      setListening(false);
      setError(event.error === 'not-allowed'
        ? 'Trình duyệt chưa được cấp quyền dùng microphone.'
        : `Nhận diện giọng nói gặp lỗi: ${event.error}.`);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <section className="glass-panel" style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Volume2 size={20} color="#a78bfa" />
        <div>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Điều khiển bằng giọng nói (bản thử nghiệm)</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0' }}>
            Khẩu lệnh cố định tiếng Việt cho LED và còi; chưa phải trợ lý AI hội thoại.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={listening ? 'btn btn-danger' : 'btn btn-primary'}
          style={buttonStyle}
          disabled={!supported || listening}
          onClick={startListening}
        >
          {listening ? <><MicOff size={16} /> Đang nghe...</> : <><Mic size={16} /> Bấm để nói</>}
        </button>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          Node đang chọn: <strong>{selectedDeviceId}</strong>
        </span>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '12px 0 0' }}>
        Ví dụ: “bật đèn đỏ”, “tắt đèn”, “bật còi”, “tắt còi”. Micro chỉ bắt đầu nghe sau khi bạn bấm nút.
      </p>
      {transcript && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '10px 0 0' }}>Bạn nói: “{transcript}”</p>}
      {message && <p role="status" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '8px 0 0' }}>{message}</p>}
      {error && <p role="alert" style={{ color: '#fda4af', fontSize: '0.85rem', margin: '8px 0 0' }}>{error}</p>}
      {!supported && <p style={{ color: '#fcd34d', fontSize: '0.8rem', margin: '8px 0 0' }}>Trình duyệt hiện tại chưa cung cấp SpeechRecognition.</p>}
    </section>
  );
}
