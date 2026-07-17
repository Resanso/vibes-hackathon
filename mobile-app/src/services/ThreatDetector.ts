import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import { Asset } from 'expo-asset';
import { Alert } from 'react-native';
import { recordThreatDetection } from '../utils/threatDetectionLog';

class ThreatDetector {
  private session: InferenceSession | null = null;
  private isInitializing = false;

  async init() {
    if (this.session || this.isInitializing) return;
    this.isInitializing = true;
    try {
      // Ensure model is bundled and get its URI
      const asset = await Asset.loadAsync(require('../../assets/threat_detection.onnx'));
      const modelUri = asset[0].localUri || asset[0].uri;
      
      this.session = await InferenceSession.create(modelUri);
      console.log('ONNX Model Loaded Successfully. Inputs:', this.session.inputNames);
    } catch (e) {
      console.error('Failed to load ONNX model', e);
    } finally {
      this.isInitializing = false;
    }
  }

  // `sourceApp` (package name) is the only thing recorded on a positive
  // detection — see threatDetectionLog.ts's header comment for why title/
  // text never gets persisted, even for the SafetyDashboard history view.
  async analyzeNotification(title: string, text: string, sourceApp: string): Promise<boolean> {
    if (!this.session) {
      await this.init();
    }
    if (!this.session) return false;

    const combinedText = `${title} ${text}`;
    
    const inputName = this.session.inputNames[0];
    const tensor = new Tensor('string', [combinedText], [1, 1]);
    
    const feeds: Record<string, Tensor> = {};
    feeds[inputName] = tensor;

    try {
      const results = await this.session.run(feeds);
      const outputName = this.session.outputNames[0]; // Output label
      const outputTensor = results[outputName];
      
      const label = outputTensor.data[0]; 
      console.log(`[ThreatDetector] Notification analyzed. Label: ${label}`);
      
      const isThreat = label === 'Threat';
      
      if (isThreat) {
        await recordThreatDetection(sourceApp);
        Alert.alert(
          "🚨 Ancaman Finansial Terdeteksi",
          "Sistem AI kami mendeteksi pola komunikasi pinjaman online yang agresif dari notifikasi Anda. Harap berhati-hati dan gunakan alternatif pinjaman kampus."
        );
      }
      
      return isThreat;
    } catch (e) {
      console.error('[ThreatDetector] Inference error', e);
      return false;
    }
  }
}

export const threatDetector = new ThreatDetector();
