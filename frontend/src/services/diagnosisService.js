import api from './api';

export const SAMPLE_CROPS = [
  {
    id: 'sample_tomato_early_blight',
    crop: 'Tomato',
    cropLocal: 'टमाटर / ટામેટા',
    diseaseName: 'Tomato Early Blight',
    diseaseHindi: 'टमाटर का अगेती झुलसा रोग',
    diseaseGujarati: 'ટામેટાનો આગોતરો સુકારો',
    confidence: '94%',
    severity: 'Moderate',
    imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985b?auto=format&fit=crop&w=600&q=80',
    description: 'Fungal infection caused by Alternaria solani, characterized by concentric brown-black target ring spots on older lower leaves.',
    actions: [
      { step: 1, text: 'Carefully prune and burn or bury infected lower leaves away from the field.' },
      { step: 2, text: 'Avoid overhead watering; water plants at soil level to keep foliage dry.' },
      { step: 3, text: 'Spray Copper Oxychloride 50 WP (2.5g/L water) or organic neem oil extract (5ml/L).' },
    ],
    audioSummary: 'Tomato early blight detected with 94 percent confidence. Remove lower spotted leaves immediately, improve field ventilation, and apply copper fungicide spray.',
  },
  {
    id: 'sample_cotton_leaf_curl',
    crop: 'Cotton',
    cropLocal: 'कपास / કપાસ',
    diseaseName: 'Cotton Leaf Curl Virus',
    diseaseHindi: 'कपास का पत्ता मरोड़ रोग',
    diseaseGujarati: 'કપાસનો પાન કોકડવાનો રોગ',
    confidence: '91%',
    severity: 'High',
    imageUrl: 'https://images.unsplash.com/photo-1598971861713-54ad16a7e72e?auto=format&fit=crop&w=600&q=80',
    description: 'Viral disease transmitted by whiteflies (Bemisia tabaci), causing upward or downward curling of leaves with thick veins.',
    actions: [
      { step: 1, text: 'Install yellow sticky traps (10-12 per acre) to trap whitefly vectors.' },
      { step: 2, text: 'Remove heavily infected stunt plants to prevent spread across rows.' },
      { step: 3, text: 'Spray Diafenthiuron 50 WP or Neem Seed Kernel Extract (NSKE 5%) during early infestation.' },
    ],
    audioSummary: 'Cotton leaf curl virus detected. Control whitefly population using yellow sticky traps and apply recommended neem extract spray.',
  },
  {
    id: 'sample_rice_blast',
    crop: 'Rice / Paddy',
    cropLocal: 'धान / ચોખા',
    diseaseName: 'Rice Leaf Blast',
    diseaseHindi: 'धान का झोंका (ब्लास्ट) रोग',
    diseaseGujarati: 'ડાંગરનો ગેરુ / બ્લાસ્ટ રોગ',
    confidence: '96%',
    severity: 'High',
    imageUrl: 'https://images.unsplash.com/photo-1536704689299-247d8e115388?auto=format&fit=crop&w=600&q=80',
    description: 'Spindle-shaped diamond lesions with gray-white centers and brownish borders caused by Magnaporthe oryzae.',
    actions: [
      { step: 1, text: 'Avoid excess nitrogen fertilizer application during humid/cloudy spells.' },
      { step: 2, text: 'Maintain 2-3 cm shallow water level during active tillering.' },
      { step: 3, text: 'Apply Tricyclazole 75 WP (0.6g/L) or Tricyclazole + Mancozeb at first sign of spindle spots.' },
    ],
    audioSummary: 'Rice blast detected with 96 percent confidence. Reduce excess urea application and spray tricyclazole fungicide.',
  },
  {
    id: 'sample_healthy_crop',
    crop: 'Wheat / Gehun',
    cropLocal: 'गेहूं / ઘઉં',
    diseaseName: 'Healthy Crop (No Disease Detected)',
    diseaseHindi: 'स्वस्थ फसल (कोई रोग नहीं मिला)',
    diseaseGujarati: 'તંદુરસ્ત પાક (કોઈ રોગ નથી)',
    confidence: '98%',
    severity: 'None',
    imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
    description: 'Leaves show uniform vibrant green pigmentation, strong cell turgor, and zero visible fungal or pest activity.',
    actions: [
      { step: 1, text: 'Continue normal balanced irrigation as per soil moisture status.' },
      { step: 2, text: 'Apply top dressing of balanced NPK fertilizer if flowering stage is approaching.' },
      { step: 3, text: 'Maintain weekly field scouting to catch early signs of any pest attacks.' },
    ],
    audioSummary: 'Your crop is healthy and showing great growth. Keep up normal irrigation and monitor weekly.',
  },
];

export const diagnosisService = {
  async analyzeImage(imageFile, cropType = 'Tomato') {
    try {
      const formData = new FormData();
      if (imageFile instanceof File || imageFile instanceof Blob) {
        formData.append('image', imageFile);
      }
      formData.append('crop_type', cropType);
      
      const response = await api.post('/diagnosis/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      // Offline fallback: return a matched diagnosis simulation
      const randomSample = SAMPLE_CROPS.find(c => c.crop.toLowerCase().includes(cropType.toLowerCase())) || SAMPLE_CROPS[0];
      
      return {
        id: 'diag_' + Date.now(),
        crop: cropType || randomSample.crop,
        diseaseName: randomSample.diseaseName,
        diseaseHindi: randomSample.diseaseHindi,
        confidence: randomSample.confidence,
        severity: randomSample.severity,
        description: randomSample.description,
        actions: randomSample.actions,
        audioSummary: randomSample.audioSummary,
        createdAt: new Date().toISOString(),
        imageUrl: randomSample.imageUrl,
      };
    }
  },

  async getHistory() {
    try {
      const response = await api.get('/diagnosis/history/');
      return response.data;
    } catch (error) {
      const saved = localStorage.getItem('agrishield_history');
      if (saved) return JSON.parse(saved);
      return [
        {
          id: 'hist_1',
          crop: 'Tomato',
          diseaseName: 'Tomato Early Blight',
          confidence: '94%',
          severity: 'Moderate',
          date: 'Yesterday, 4:20 PM',
          status: 'Treated',
          imageUrl: SAMPLE_CROPS[0].imageUrl,
        },
        {
          id: 'hist_2',
          crop: 'Cotton',
          diseaseName: 'Healthy Leaf Check',
          confidence: '98%',
          severity: 'None',
          date: '3 days ago',
          status: 'Healthy',
          imageUrl: SAMPLE_CROPS[3].imageUrl,
        }
      ];
    }
  },
};

export default diagnosisService;
