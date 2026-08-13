import { useEffect, useRef, useState, useCallback } from 'react';
import { Device } from '@twilio/voice-sdk';
import { getToken } from '../lib/api';

export function useTwilioDevice() {
  const deviceRef = useRef(null);
  const [deviceState, setDeviceState] = useState('unregistered'); // unregistered | registering | registered | error
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState(null); // initiated | ringing | in-progress | completed | failed
  const [error, setError] = useState(null);

  const setupDevice = useCallback(async () => {
    try {
      setDeviceState('registering');
      const token = await getToken();
      const device = new Device(token, {
        logLevel: 1,
        codecPreferences: ['opus', 'pcmu'],
      });

      device.on('registered', () => setDeviceState('registered'));
      device.on('unregistered', () => setDeviceState('unregistered'));
      device.on('error', (err) => {
        console.error('Twilio Device error:', err);
        setError(err.message);
        setDeviceState('error');
      });

      device.on('incoming', (call) => {
        setIncomingCall(call);
        call.on('cancel', () => setIncomingCall(null));
        call.on('disconnect', () => {
          setIncomingCall(null);
          setActiveCall(null);
          setCallStatus('completed');
        });
      });

      device.on('tokenWillExpire', async () => {
        const newToken = await getToken();
        device.updateToken(newToken);
      });

      await device.register();
      deviceRef.current = device;
    } catch (err) {
      console.error('Failed to set up Twilio Device:', err);
      setError(err.message);
      setDeviceState('error');
    }
  }, []);

  useEffect(() => {
    setupDevice();
    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
    };
  }, [setupDevice]);

  const makeCall = useCallback(async (toNumber) => {
    if (!deviceRef.current || deviceRef.current.state !== 'registered') {
      throw new Error('Device not ready');
    }
    const call = await deviceRef.current.connect({
      params: { To: toNumber },
    });
    setActiveCall(call);
    setCallStatus('initiated');

    call.on('ringing', () => setCallStatus('ringing'));
    call.on('accept', () => setCallStatus('in-progress'));
    call.on('disconnect', () => {
      setActiveCall(null);
      setCallStatus('completed');
    });
    call.on('cancel', () => {
      setActiveCall(null);
      setCallStatus('cancelled');
    });
    call.on('error', (err) => {
      setError(err.message);
      setActiveCall(null);
      setCallStatus('failed');
    });

    return call;
  }, []);

  const acceptIncoming = useCallback(() => {
    if (!incomingCall) return;
    incomingCall.accept();
    setActiveCall(incomingCall);
    setCallStatus('in-progress');
    setIncomingCall(null);
  }, [incomingCall]);

  const rejectIncoming = useCallback(() => {
    if (!incomingCall) return;
    incomingCall.reject();
    setIncomingCall(null);
  }, [incomingCall]);

  const hangUp = useCallback(() => {
    if (activeCall) {
      activeCall.disconnect();
    }
    if (deviceRef.current) {
      deviceRef.current.disconnectAll();
    }
    setActiveCall(null);
    setCallStatus('completed');
  }, [activeCall]);

  const muteCall = useCallback((muted) => {
    if (activeCall) activeCall.mute(muted);
  }, [activeCall]);

  const sendDigit = useCallback((digit) => {
    if (activeCall) activeCall.sendDigits(digit);
  }, [activeCall]);

  return {
    deviceState,
    activeCall,
    incomingCall,
    callStatus,
    error,
    makeCall,
    hangUp,
    muteCall,
    sendDigit,
    acceptIncoming,
    rejectIncoming,
    reconnect: setupDevice,
  };
}
