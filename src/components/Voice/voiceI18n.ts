/**
 * Localized copy for the voice capture flow.
 *
 * Kept local to the Voice module rather than folded into `src/translations.js`
 * because the QR Gateway runs standalone (no LanguageProvider on the tree) and
 * addresses locales by BCP-47 tag, while the main app uses short codes.
 * `resolveVoiceLocale` bridges the two.
 *
 * Covers the platform's 9 supported languages plus Marathi, which the QR
 * Gateway already offers to Pune-belt shop floors.
 */

export type VoiceStringKey =
  // capture
  | 'tapToRecord'
  | 'recording'
  | 'stopRecording'
  | 'requestingMic'
  // playback
  | 'hearItBack'
  | 'playbackHint'
  | 'play'
  | 'pause'
  | 'replay'
  | 'audioPlayerLabel'
  | 'recordingLength'
  // actions
  | 'reRecord'
  | 'sendForTranscription'
  | 'transcribing'
  | 'typeInstead'
  | 'retry'
  // permission + capability
  | 'micPermissionTitle'
  | 'micPermissionDesc'
  | 'micDeniedTitle'
  | 'micDeniedDesc'
  | 'unsupportedTitle'
  | 'unsupportedDesc'
  // errors
  | 'offlineTitle'
  | 'offlineDesc'
  | 'errorTooShort'
  | 'errorTooLong'
  | 'errorNoSpeech'
  | 'errorNotConfigured'
  | 'errorRateLimited'
  | 'errorNetwork'
  | 'errorUnknown';

export type VoiceStrings = Readonly<Record<VoiceStringKey, string>>;

/** Canonical BCP-47 tag per supported language. */
export type VoiceLocale =
  | 'en-US'
  | 'hi-IN'
  | 'mr-IN'
  | 'es-ES'
  | 'fr-FR'
  | 'de-DE'
  | 'pt-BR'
  | 'ru-RU'
  | 'zh-CN'
  | 'ar-SA';

const en: VoiceStrings = {
  tapToRecord: 'Tap to speak the problem',
  recording: 'Listening…',
  stopRecording: 'Stop recording',
  requestingMic: 'Waiting for microphone permission…',
  hearItBack: 'Hear it back',
  playbackHint: 'Play it once, re-record if needed, then send it for transcription.',
  play: 'Play recording',
  pause: 'Pause recording',
  replay: 'Replay from start',
  audioPlayerLabel: 'Your recorded problem report',
  recordingLength: 'Recording length',
  reRecord: 'Re-record',
  sendForTranscription: 'Send for transcription',
  transcribing: 'Transcribing…',
  typeInstead: 'Type it instead',
  retry: 'Try again',
  micPermissionTitle: 'Microphone permission needed',
  micPermissionDesc: 'TurboFix needs microphone access to hear the problem. Allow it when your browser asks.',
  micDeniedTitle: 'Microphone access blocked',
  micDeniedDesc: 'Microphone access is blocked for this site. Enable it in your browser settings, or type the problem instead.',
  unsupportedTitle: 'Voice not supported here',
  unsupportedDesc: 'This browser cannot record audio. Please type the problem instead.',
  offlineTitle: 'You are offline',
  offlineDesc: 'Voice transcription needs a connection. Type the problem and it will be sent when you are back online.',
  errorTooShort: 'That recording was too short. Hold the button and speak for a moment longer.',
  errorTooLong: 'That recording is too long. Please keep it under a minute.',
  errorNoSpeech: 'No speech was detected. Please record again or type the problem.',
  errorNotConfigured: 'Voice transcription is not set up right now. Please type the problem.',
  errorRateLimited: 'Voice transcription is busy right now. Please try again in a moment.',
  errorNetwork: 'Network problem while transcribing. Please try again or type the problem.',
  errorUnknown: 'Could not transcribe the recording. Please try again or type the problem.',
};

const hi: VoiceStrings = {
  tapToRecord: 'समस्या बताने के लिए दबाएं',
  recording: 'सुन रहा हूँ…',
  stopRecording: 'रिकॉर्डिंग रोकें',
  requestingMic: 'माइक अनुमति का इंतज़ार…',
  hearItBack: 'रिकॉर्डिंग सुनें',
  playbackHint: 'एक बार सुनें, ज़रूरत हो तो दोबारा रिकॉर्ड करें, फिर भेजें।',
  play: 'रिकॉर्डिंग चलाएं',
  pause: 'रोकें',
  replay: 'शुरू से चलाएं',
  audioPlayerLabel: 'आपकी रिकॉर्ड की गई समस्या',
  recordingLength: 'रिकॉर्डिंग की अवधि',
  reRecord: 'दोबारा रिकॉर्ड करें',
  sendForTranscription: 'ट्रांसक्रिप्शन के लिए भेजें',
  transcribing: 'समझ रहा हूँ…',
  typeInstead: 'लिखकर बताएं',
  retry: 'फिर कोशिश करें',
  micPermissionTitle: 'माइक अनुमति चाहिए',
  micPermissionDesc: 'समस्या सुनने के लिए टर्बोफिक्स को माइक की अनुमति चाहिए। ब्राउज़र पूछे तो अनुमति दें।',
  micDeniedTitle: 'माइक एक्सेस बंद है',
  micDeniedDesc: 'इस साइट के लिए माइक बंद है। ब्राउज़र सेटिंग में चालू करें, या समस्या लिखकर बताएं।',
  unsupportedTitle: 'यहाँ आवाज़ काम नहीं करेगी',
  unsupportedDesc: 'यह ब्राउज़र ऑडियो रिकॉर्ड नहीं कर सकता। कृपया लिखकर बताएं।',
  offlineTitle: 'आप ऑफ़लाइन हैं',
  offlineDesc: 'ट्रांसक्रिप्शन के लिए इंटरनेट चाहिए। समस्या लिख दें, कनेक्शन आते ही भेज दी जाएगी।',
  errorTooShort: 'रिकॉर्डिंग बहुत छोटी थी। थोड़ी देर और बोलें।',
  errorTooLong: 'रिकॉर्डिंग बहुत लंबी है। कृपया एक मिनट के अंदर रखें।',
  errorNoSpeech: 'कोई आवाज़ नहीं मिली। दोबारा रिकॉर्ड करें या लिखकर बताएं।',
  errorNotConfigured: 'ट्रांसक्रिप्शन अभी सेट नहीं है। कृपया लिखकर बताएं।',
  errorRateLimited: 'ट्रांसक्रिप्शन अभी व्यस्त है। थोड़ी देर बाद कोशिश करें।',
  errorNetwork: 'नेटवर्क समस्या हुई। दोबारा कोशिश करें या लिखकर बताएं।',
  errorUnknown: 'ट्रांसक्रिप्शन नहीं हो सका। दोबारा कोशिश करें या लिखकर बताएं।',
};

const mr: VoiceStrings = {
  tapToRecord: 'समस्या सांगण्यासाठी दाबा',
  recording: 'ऐकत आहे…',
  stopRecording: 'रेकॉर्डिंग थांबवा',
  requestingMic: 'माइक परवानगीची वाट पाहत आहे…',
  hearItBack: 'रेकॉर्डिंग ऐका',
  playbackHint: 'एकदा ऐका, गरज असल्यास पुन्हा रेकॉर्ड करा, मग पाठवा.',
  play: 'रेकॉर्डिंग चालवा',
  pause: 'थांबवा',
  replay: 'सुरुवातीपासून चालवा',
  audioPlayerLabel: 'तुम्ही रेकॉर्ड केलेली समस्या',
  recordingLength: 'रेकॉर्डिंगचा कालावधी',
  reRecord: 'पुन्हा रेकॉर्ड करा',
  sendForTranscription: 'ट्रान्सक्रिप्शनसाठी पाठवा',
  transcribing: 'समजून घेत आहे…',
  typeInstead: 'टाईप करून सांगा',
  retry: 'पुन्हा प्रयत्न करा',
  micPermissionTitle: 'माइक परवानगी हवी',
  micPermissionDesc: 'समस्या ऐकण्यासाठी टर्बोफिक्सला माइक परवानगी हवी. ब्राउझर विचारेल तेव्हा परवानगी द्या.',
  micDeniedTitle: 'माइक प्रवेश बंद आहे',
  micDeniedDesc: 'या साइटसाठी माइक बंद आहे. ब्राउझर सेटिंगमध्ये चालू करा, किंवा टाईप करून सांगा.',
  unsupportedTitle: 'इथे आवाज चालणार नाही',
  unsupportedDesc: 'हा ब्राउझर ऑडिओ रेकॉर्ड करू शकत नाही. कृपया टाईप करून सांगा.',
  offlineTitle: 'तुम्ही ऑफलाइन आहात',
  offlineDesc: 'ट्रान्सक्रिप्शनसाठी इंटरनेट लागते. समस्या लिहा, कनेक्शन आल्यावर पाठवली जाईल.',
  errorTooShort: 'रेकॉर्डिंग खूप लहान होती. थोडा वेळ अधिक बोला.',
  errorTooLong: 'रेकॉर्डिंग खूप मोठी आहे. कृपया एका मिनिटाच्या आत ठेवा.',
  errorNoSpeech: 'आवाज ओळखता आला नाही. पुन्हा रेकॉर्ड करा किंवा टाईप करा.',
  errorNotConfigured: 'ट्रान्सक्रिप्शन सध्या सेट नाही. कृपया टाईप करून सांगा.',
  errorRateLimited: 'ट्रान्सक्रिप्शन सध्या व्यस्त आहे. थोड्या वेळाने प्रयत्न करा.',
  errorNetwork: 'नेटवर्क अडचण आली. पुन्हा प्रयत्न करा किंवा टाईप करा.',
  errorUnknown: 'ट्रान्सक्रिप्शन होऊ शकले नाही. पुन्हा प्रयत्न करा किंवा टाईप करा.',
};

const es: VoiceStrings = {
  tapToRecord: 'Toca para describir el problema',
  recording: 'Escuchando…',
  stopRecording: 'Detener grabación',
  requestingMic: 'Esperando permiso del micrófono…',
  hearItBack: 'Escucha la grabación',
  playbackHint: 'Escúchala una vez, vuelve a grabar si hace falta y luego envíala.',
  play: 'Reproducir grabación',
  pause: 'Pausar grabación',
  replay: 'Reproducir desde el inicio',
  audioPlayerLabel: 'Tu informe de problema grabado',
  recordingLength: 'Duración de la grabación',
  reRecord: 'Grabar de nuevo',
  sendForTranscription: 'Enviar para transcribir',
  transcribing: 'Transcribiendo…',
  typeInstead: 'Escríbelo mejor',
  retry: 'Reintentar',
  micPermissionTitle: 'Se necesita permiso del micrófono',
  micPermissionDesc: 'TurboFix necesita acceso al micrófono para escuchar el problema. Permítelo cuando el navegador lo pida.',
  micDeniedTitle: 'Acceso al micrófono bloqueado',
  micDeniedDesc: 'El micrófono está bloqueado para este sitio. Actívalo en la configuración del navegador o escribe el problema.',
  unsupportedTitle: 'La voz no funciona aquí',
  unsupportedDesc: 'Este navegador no puede grabar audio. Escribe el problema.',
  offlineTitle: 'Estás sin conexión',
  offlineDesc: 'La transcripción necesita conexión. Escribe el problema y se enviará al reconectar.',
  errorTooShort: 'La grabación fue demasiado corta. Habla un momento más.',
  errorTooLong: 'La grabación es demasiado larga. Que dure menos de un minuto.',
  errorNoSpeech: 'No se detectó voz. Graba otra vez o escribe el problema.',
  errorNotConfigured: 'La transcripción no está configurada. Escribe el problema.',
  errorRateLimited: 'La transcripción está ocupada. Inténtalo en un momento.',
  errorNetwork: 'Problema de red al transcribir. Reinténtalo o escribe el problema.',
  errorUnknown: 'No se pudo transcribir. Reinténtalo o escribe el problema.',
};

const fr: VoiceStrings = {
  tapToRecord: 'Appuyez pour décrire le problème',
  recording: 'Écoute en cours…',
  stopRecording: "Arrêter l'enregistrement",
  requestingMic: "En attente de l'autorisation du micro…",
  hearItBack: "Réécoutez l'enregistrement",
  playbackHint: "Écoutez-le une fois, réenregistrez si besoin, puis envoyez-le.",
  play: "Lire l'enregistrement",
  pause: "Mettre en pause",
  replay: 'Relire depuis le début',
  audioPlayerLabel: 'Votre signalement enregistré',
  recordingLength: "Durée de l'enregistrement",
  reRecord: 'Réenregistrer',
  sendForTranscription: 'Envoyer pour transcription',
  transcribing: 'Transcription…',
  typeInstead: 'Écrire à la place',
  retry: 'Réessayer',
  micPermissionTitle: 'Autorisation du micro requise',
  micPermissionDesc: "TurboFix a besoin du micro pour entendre le problème. Autorisez-le lorsque le navigateur le demande.",
  micDeniedTitle: 'Accès au micro bloqué',
  micDeniedDesc: "Le micro est bloqué pour ce site. Activez-le dans les paramètres du navigateur, ou écrivez le problème.",
  unsupportedTitle: 'Voix non prise en charge ici',
  unsupportedDesc: "Ce navigateur ne peut pas enregistrer l'audio. Écrivez le problème.",
  offlineTitle: 'Vous êtes hors ligne',
  offlineDesc: "La transcription nécessite une connexion. Écrivez le problème, il sera envoyé au retour du réseau.",
  errorTooShort: "L'enregistrement était trop court. Parlez un instant de plus.",
  errorTooLong: "L'enregistrement est trop long. Restez sous une minute.",
  errorNoSpeech: "Aucune parole détectée. Réenregistrez ou écrivez le problème.",
  errorNotConfigured: "La transcription n'est pas configurée. Écrivez le problème.",
  errorRateLimited: 'La transcription est saturée. Réessayez dans un instant.',
  errorNetwork: 'Problème réseau pendant la transcription. Réessayez ou écrivez le problème.',
  errorUnknown: "Transcription impossible. Réessayez ou écrivez le problème.",
};

const de: VoiceStrings = {
  tapToRecord: 'Tippen und Problem beschreiben',
  recording: 'Höre zu…',
  stopRecording: 'Aufnahme stoppen',
  requestingMic: 'Warte auf Mikrofonfreigabe…',
  hearItBack: 'Aufnahme anhören',
  playbackHint: 'Einmal anhören, bei Bedarf neu aufnehmen, dann senden.',
  play: 'Aufnahme abspielen',
  pause: 'Pausieren',
  replay: 'Von vorn abspielen',
  audioPlayerLabel: 'Ihre aufgenommene Problemmeldung',
  recordingLength: 'Aufnahmedauer',
  reRecord: 'Neu aufnehmen',
  sendForTranscription: 'Zur Transkription senden',
  transcribing: 'Transkribiere…',
  typeInstead: 'Stattdessen tippen',
  retry: 'Erneut versuchen',
  micPermissionTitle: 'Mikrofonfreigabe erforderlich',
  micPermissionDesc: 'TurboFix braucht Mikrofonzugriff, um das Problem zu hören. Bitte im Browser erlauben.',
  micDeniedTitle: 'Mikrofonzugriff blockiert',
  micDeniedDesc: 'Das Mikrofon ist für diese Seite blockiert. In den Browsereinstellungen aktivieren oder das Problem tippen.',
  unsupportedTitle: 'Sprache hier nicht möglich',
  unsupportedDesc: 'Dieser Browser kann kein Audio aufnehmen. Bitte tippen Sie das Problem.',
  offlineTitle: 'Sie sind offline',
  offlineDesc: 'Die Transkription braucht eine Verbindung. Tippen Sie das Problem — es wird später gesendet.',
  errorTooShort: 'Die Aufnahme war zu kurz. Sprechen Sie einen Moment länger.',
  errorTooLong: 'Die Aufnahme ist zu lang. Bitte unter einer Minute bleiben.',
  errorNoSpeech: 'Keine Sprache erkannt. Neu aufnehmen oder das Problem tippen.',
  errorNotConfigured: 'Transkription ist nicht eingerichtet. Bitte tippen Sie das Problem.',
  errorRateLimited: 'Transkription ist gerade ausgelastet. Gleich noch einmal versuchen.',
  errorNetwork: 'Netzwerkproblem bei der Transkription. Erneut versuchen oder tippen.',
  errorUnknown: 'Transkription fehlgeschlagen. Erneut versuchen oder tippen.',
};

const pt: VoiceStrings = {
  tapToRecord: 'Toque para descrever o problema',
  recording: 'Ouvindo…',
  stopRecording: 'Parar gravação',
  requestingMic: 'Aguardando permissão do microfone…',
  hearItBack: 'Ouça a gravação',
  playbackHint: 'Ouça uma vez, grave de novo se precisar e depois envie.',
  play: 'Reproduzir gravação',
  pause: 'Pausar gravação',
  replay: 'Reproduzir do início',
  audioPlayerLabel: 'Seu relato de problema gravado',
  recordingLength: 'Duração da gravação',
  reRecord: 'Gravar de novo',
  sendForTranscription: 'Enviar para transcrição',
  transcribing: 'Transcrevendo…',
  typeInstead: 'Digitar em vez disso',
  retry: 'Tentar de novo',
  micPermissionTitle: 'Permissão do microfone necessária',
  micPermissionDesc: 'O TurboFix precisa do microfone para ouvir o problema. Permita quando o navegador pedir.',
  micDeniedTitle: 'Acesso ao microfone bloqueado',
  micDeniedDesc: 'O microfone está bloqueado neste site. Ative nas configurações do navegador ou digite o problema.',
  unsupportedTitle: 'Voz não funciona aqui',
  unsupportedDesc: 'Este navegador não grava áudio. Digite o problema.',
  offlineTitle: 'Você está offline',
  offlineDesc: 'A transcrição precisa de conexão. Digite o problema e ele será enviado ao reconectar.',
  errorTooShort: 'A gravação foi curta demais. Fale mais um instante.',
  errorTooLong: 'A gravação está longa demais. Mantenha abaixo de um minuto.',
  errorNoSpeech: 'Nenhuma fala detectada. Grave de novo ou digite o problema.',
  errorNotConfigured: 'A transcrição não está configurada. Digite o problema.',
  errorRateLimited: 'A transcrição está ocupada. Tente novamente em instantes.',
  errorNetwork: 'Problema de rede ao transcrever. Tente de novo ou digite.',
  errorUnknown: 'Não foi possível transcrever. Tente de novo ou digite.',
};

const ru: VoiceStrings = {
  tapToRecord: 'Нажмите, чтобы описать проблему',
  recording: 'Слушаю…',
  stopRecording: 'Остановить запись',
  requestingMic: 'Ожидание доступа к микрофону…',
  hearItBack: 'Прослушать запись',
  playbackHint: 'Прослушайте, при необходимости перезапишите, затем отправьте.',
  play: 'Воспроизвести запись',
  pause: 'Пауза',
  replay: 'Воспроизвести сначала',
  audioPlayerLabel: 'Ваша записанная заявка',
  recordingLength: 'Длительность записи',
  reRecord: 'Записать заново',
  sendForTranscription: 'Отправить на расшифровку',
  transcribing: 'Расшифровка…',
  typeInstead: 'Ввести текстом',
  retry: 'Повторить',
  micPermissionTitle: 'Нужен доступ к микрофону',
  micPermissionDesc: 'TurboFix нужен микрофон, чтобы услышать проблему. Разрешите доступ в браузере.',
  micDeniedTitle: 'Доступ к микрофону заблокирован',
  micDeniedDesc: 'Микрофон заблокирован для этого сайта. Включите его в настройках браузера или введите текст.',
  unsupportedTitle: 'Голос здесь не поддерживается',
  unsupportedDesc: 'Этот браузер не может записывать звук. Введите проблему текстом.',
  offlineTitle: 'Нет подключения',
  offlineDesc: 'Для расшифровки нужна сеть. Введите проблему — она отправится при подключении.',
  errorTooShort: 'Запись слишком короткая. Говорите чуть дольше.',
  errorTooLong: 'Запись слишком длинная. Уложитесь в минуту.',
  errorNoSpeech: 'Речь не распознана. Запишите снова или введите текст.',
  errorNotConfigured: 'Расшифровка не настроена. Введите проблему текстом.',
  errorRateLimited: 'Сервис расшифровки занят. Повторите через минуту.',
  errorNetwork: 'Сетевая ошибка при расшифровке. Повторите или введите текст.',
  errorUnknown: 'Не удалось расшифровать. Повторите или введите текст.',
};

const zh: VoiceStrings = {
  tapToRecord: '点击说出问题',
  recording: '正在聆听…',
  stopRecording: '停止录音',
  requestingMic: '正在等待麦克风权限…',
  hearItBack: '回放录音',
  playbackHint: '先听一遍，需要的话重录，然后发送。',
  play: '播放录音',
  pause: '暂停',
  replay: '从头播放',
  audioPlayerLabel: '您录制的故障报告',
  recordingLength: '录音时长',
  reRecord: '重新录音',
  sendForTranscription: '发送转写',
  transcribing: '正在转写…',
  typeInstead: '改为输入文字',
  retry: '重试',
  micPermissionTitle: '需要麦克风权限',
  micPermissionDesc: 'TurboFix 需要麦克风才能听到问题。浏览器询问时请允许。',
  micDeniedTitle: '麦克风访问被阻止',
  micDeniedDesc: '本站的麦克风已被阻止。请在浏览器设置中启用，或改为输入文字。',
  unsupportedTitle: '此处不支持语音',
  unsupportedDesc: '此浏览器无法录音。请输入文字描述问题。',
  offlineTitle: '当前离线',
  offlineDesc: '转写需要网络。请输入文字，恢复联网后会自动发送。',
  errorTooShort: '录音太短。请多说一会儿。',
  errorTooLong: '录音太长。请控制在一分钟以内。',
  errorNoSpeech: '未检测到语音。请重新录音或输入文字。',
  errorNotConfigured: '转写服务尚未配置。请输入文字。',
  errorRateLimited: '转写服务繁忙。请稍后重试。',
  errorNetwork: '转写时网络出错。请重试或输入文字。',
  errorUnknown: '无法转写。请重试或输入文字。',
};

const ar: VoiceStrings = {
  tapToRecord: 'اضغط لوصف المشكلة',
  recording: 'جارٍ الاستماع…',
  stopRecording: 'إيقاف التسجيل',
  requestingMic: 'في انتظار إذن الميكروفون…',
  hearItBack: 'استمع إلى التسجيل',
  playbackHint: 'استمع مرة واحدة، وأعد التسجيل إذا لزم الأمر، ثم أرسله.',
  play: 'تشغيل التسجيل',
  pause: 'إيقاف مؤقت',
  replay: 'التشغيل من البداية',
  audioPlayerLabel: 'بلاغ المشكلة المسجل',
  recordingLength: 'مدة التسجيل',
  reRecord: 'إعادة التسجيل',
  sendForTranscription: 'إرسال للتفريغ النصي',
  transcribing: 'جارٍ التفريغ…',
  typeInstead: 'اكتبها بدلاً من ذلك',
  retry: 'إعادة المحاولة',
  micPermissionTitle: 'مطلوب إذن الميكروفون',
  micPermissionDesc: 'يحتاج TurboFix إلى الميكروفون لسماع المشكلة. اسمح به عندما يطلب المتصفح ذلك.',
  micDeniedTitle: 'تم حظر الوصول إلى الميكروفون',
  micDeniedDesc: 'الميكروفون محظور لهذا الموقع. فعّله من إعدادات المتصفح، أو اكتب المشكلة.',
  unsupportedTitle: 'الصوت غير مدعوم هنا',
  unsupportedDesc: 'لا يستطيع هذا المتصفح تسجيل الصوت. يرجى كتابة المشكلة.',
  offlineTitle: 'أنت غير متصل',
  offlineDesc: 'يحتاج التفريغ النصي إلى اتصال. اكتب المشكلة وسيتم إرسالها عند عودة الاتصال.',
  errorTooShort: 'التسجيل قصير جدًا. تحدث للحظة أطول.',
  errorTooLong: 'التسجيل طويل جدًا. اجعله أقل من دقيقة.',
  errorNoSpeech: 'لم يتم اكتشاف أي كلام. أعد التسجيل أو اكتب المشكلة.',
  errorNotConfigured: 'التفريغ النصي غير مُعد حاليًا. يرجى كتابة المشكلة.',
  errorRateLimited: 'خدمة التفريغ مشغولة الآن. حاول بعد قليل.',
  errorNetwork: 'مشكلة في الشبكة أثناء التفريغ. أعد المحاولة أو اكتب المشكلة.',
  errorUnknown: 'تعذر التفريغ النصي. أعد المحاولة أو اكتب المشكلة.',
};

const CATALOG: Readonly<Record<VoiceLocale, VoiceStrings>> = {
  'en-US': en,
  'hi-IN': hi,
  'mr-IN': mr,
  'es-ES': es,
  'fr-FR': fr,
  'de-DE': de,
  'pt-BR': pt,
  'ru-RU': ru,
  'zh-CN': zh,
  'ar-SA': ar,
};

/** Short code -> canonical tag, so `useLanguage()`'s `en`/`hi`/`ar` resolve. */
const SHORT_CODE_MAP: Readonly<Record<string, VoiceLocale>> = {
  en: 'en-US',
  hi: 'hi-IN',
  mr: 'mr-IN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-BR',
  ru: 'ru-RU',
  zh: 'zh-CN',
  ar: 'ar-SA',
};

/** Languages written right-to-left. */
const RTL_PREFIXES: readonly string[] = ['ar', 'he', 'fa', 'ur'];

export const SUPPORTED_VOICE_LOCALES = Object.keys(CATALOG) as readonly VoiceLocale[];

/**
 * Map any locale-ish string onto a supported tag.
 * Accepts `hi`, `hi-IN`, `HI_in`, and unknown values (which fall back to en-US).
 */
export function resolveVoiceLocale(locale: string | undefined | null): VoiceLocale {
  if (!locale) return 'en-US';
  const normalized = String(locale).replace('_', '-').trim();
  const exact = SUPPORTED_VOICE_LOCALES.find(
    (tag) => tag.toLowerCase() === normalized.toLowerCase()
  );
  if (exact) return exact;
  const prefix = normalized.split('-')[0]?.toLowerCase() ?? '';
  return SHORT_CODE_MAP[prefix] ?? 'en-US';
}

/** True when the locale's script runs right-to-left. */
export function isRtlLocale(locale: string | undefined | null): boolean {
  const prefix = String(locale ?? '').split('-')[0]?.toLowerCase() ?? '';
  return RTL_PREFIXES.includes(prefix);
}

/** Full string table for a locale, always defined. */
export function getVoiceStrings(locale: string | undefined | null): VoiceStrings {
  return CATALOG[resolveVoiceLocale(locale)];
}

/** Translator bound to a locale. Falls back to English for missing keys. */
export function createVoiceTranslator(
  locale: string | undefined | null
): (key: VoiceStringKey) => string {
  const strings = getVoiceStrings(locale);
  return (key) => strings[key] ?? en[key] ?? key;
}
