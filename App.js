import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, SafeAreaView, Modal, Switch, ScrollView, StatusBar, Platform, KeyboardAvoidingView, ActivityIndicator, Alert, Image
} from 'react-native';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }) });
const AUTH_KEY = '@ultra_auth_v2';
const TASKS_KEY = '@ultra_tasks_v8';
const NOTES_KEY = '@ultra_notes_v8';
const CATEGORIES = {
  'خانه': { color: '#0EA5E9', icon: 'home-variant', subs: ['خرید روزانه', 'خرید مواد غذایی', 'خرید لوازم خانه', 'نظافت منزل', 'شست‌وشو و لباس', 'مرتب‌سازی و نظم', 'تعمیرات خانه', 'رسیدگی به باغچه', 'قبوض و شارژ', 'آشپزی و آماده‌سازی غذا', 'مهمانی و پذیرایی', 'رسیدگی به حیوان خانگی', 'جابجایی و اسباب‌کشی', 'سایر امور خانه'] },
  'کار': { color: '#8B5CF6', icon: 'briefcase-outline', subs: ['جلسه کاری', 'تماس کاری', 'پیگیری مشتری', 'پروژه', 'وظایف روزانه', 'ارسال ایمیل', 'پاسخ به پیام‌ها', 'تولید محتوا', 'شبکه‌های اجتماعی', 'گزارش و ارائه', 'مطالعه و آموزش کاری', 'قرار با همکار', 'ددلاین و تحویل', 'مدیریت تیم', 'سایر امور کاری'] },
  'شخصی': { color: '#F59E0B', icon: 'account-outline', subs: ['ورزش و تمرین', 'پیاده‌روی', 'سلامت و درمان', 'دارو و مکمل', 'دکتر و آزمایش', 'مطالعه کتاب', 'یادگیری مهارت', 'هدف شخصی', 'استراحت', 'تفریح و سرگرمی', 'قرار دوستانه', 'رسیدگی به خود', 'سفر', 'کارهای اداری شخصی', 'سایر امور شخصی'] },
  'مالی': { color: '#10B981', icon: 'wallet-outline', subs: ['پرداخت قبض', 'پرداخت قسط', 'اجاره و مسکن', 'خرید و هزینه', 'بودجه‌بندی', 'پس‌انداز', 'سرمایه‌گذاری', 'پیگیری وام', 'مالیات', 'حقوق و درآمد', 'بیمه', 'حساب و بانک', 'بدهی و طلب', 'اشتراک‌ها', 'سایر امور مالی'] }
};
const EVENT_TYPES = [
  { id: 'event', icon: 'calendar-check', label: 'رویداد' },
  { id: 'birthday', icon: 'cake', label: 'تولد' },
  { id: 'anniversary', icon: 'ribbon', label: 'سالگرد' },
  { id: 'task', icon: 'checkbox-marked-circle-outline', label: 'وظیفه' }
];
const WEEK_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

// Jalali date conversion helpers and local notification scheduling
function jalaliToGregorian(jy, jm, jd) {
  jy += 1595;
  let days = -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4);
  days += jm <= 6 ? (jm - 1) * 31 : 186 + (jm - 7) * 30;
  days += jd - 1;
  let gy = 400 * Math.floor(days / 146097); days %= 146097;
  if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
  gy += 4 * Math.floor(days / 1461); days %= 1461;
  if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  let gd = days + 1; const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const months = [31, leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31];
  let gm=1; while (gm<=12 && gd>months[gm-1]) { gd-=months[gm-1]; gm++; }
  return [gy,gm,gd];
}
function toLocalDateFromJalali(dateText, timeText, offsetDays=0) {
  const digits='۰۱۲۳۴۵۶۷۸۹'; const norm=dateText.replace(/[۰-۹]/g,c=>digits.indexOf(c));
  const [jy,jm,jd]=norm.split('/').map(Number); const [gy,gm,gd]=jalaliToGregorian(jy,jm,jd);
  const [hh,mm]=timeText.split(':').map(Number); const dt=new Date(gy,gm-1,gd,hh||0,mm||0,0,0); dt.setDate(dt.getDate()-offsetDays); return dt;
}
function faDigits(v){return String(v).replace(/[0-9]/g,n=>'۰۱۲۳۴۵۶۷۸۹'[n]);}
function prettyJalaliDate(dateText){const d='۰۱۲۳۴۵۶۷۸۹';const norm=dateText.replace(/[۰-۹]/g,c=>d.indexOf(c));const [y,m,day]=norm.split('/').map(Number);const names=['','فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];return `${faDigits(day)} ${names[m]||''} ${faDigits(y)}`;}

export default function App() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('register');
  const [storedAuth, setStoredAuth] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [activeScreen, setActiveScreen] = useState('calendar'); 
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('event'); 
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('event');
  const [mainCategory, setMainCategory] = useState('خانه');
  const [subCategory, setSubCategory] = useState('خرید روزانه');
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);
  const [hasAlarm, setHasAlarm] = useState(true);
  const [isEmergency, setIsEmergency] = useState(false);
  const [remindOneDayBefore, setRemindOneDayBefore] = useState(false);
  const [remindTwoDaysBefore, setRemindTwoDaysBefore] = useState(false);
  const [selectedDate, setSelectedDate] = useState('۱۴۰۵/۰۸/۲۶');
  const [selectedTime, setSelectedTime] = useState('۲۰:۰۰');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerStep, setTimePickerStep] = useState('hour');
  const [pickerMonth, setPickerMonth] = useState(8);
  const [pickerYear, setPickerYear] = useState(1405);
  const [eventImages, setEventImages] = useState([]);
  const [eventAudio, setEventAudio] = useState(null);
  const [audioSound, setAudioSound] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioRecording, setAudioRecording] = useState(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [noteContent, setNoteContent] = useState('');
  useEffect(() => {
    checkAuthAndBiometrics();
    loadData();
  }, []);
  useEffect(() => {
    if (isLoggedIn) {
      saveData(TASKS_KEY, tasks);
      saveData(NOTES_KEY, notes);
    }
  }, [tasks, notes, isLoggedIn]);
  const checkAuthAndBiometrics = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);
      const authData = await AsyncStorage.getItem(AUTH_KEY);
      if (authData) {
        const parsed = JSON.parse(authData);
        setStoredAuth(parsed);
        setAuthMode('login');
        setUsernameInput(parsed.username); 
      } else {
        setAuthMode('register');
      }
    } catch (e) { console.log(e); }
    setIsCheckingAuth(false);
  };
  const handleBiometricAuth = async () => {
    try {
      const savedBiometrics = await LocalAuthentication.isEnrolledAsync();
      if (!savedBiometrics) {
        setAuthError('اثر انگشت یا چهره‌ای در گوشی ثبت نشده است.');
        return;
      }
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'ورود با اثر انگشت',
        fallbackLabel: 'استفاده از رمز عبور',
        cancelLabel: 'لغو'
      });
      if (biometricAuth.success) {
        setIsLoggedIn(true);
        setAuthError('');
        setPasswordInput('');
      }
    } catch (error) {
      setAuthError('خطا در احراز هویت بیومتریک.');
    }
  };
  const handleAuthenticate = async () => {
    setAuthError('');
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setAuthError('لطفاً فیلدها را پر کنید.');
      return;
    }
    if (authMode === 'register') {
      const newAuth = { username: usernameInput, password: passwordInput };
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newAuth));
      setStoredAuth(newAuth);
      setIsLoggedIn(true);
      setAuthMode('login');
      setPasswordInput('');
    } else {
      if (storedAuth.username === usernameInput && storedAuth.password === passwordInput) {
        setIsLoggedIn(true);
        setPasswordInput('');
      } else {
        setAuthError('رمز عبور اشتباه است.');
      }
    }
  };
  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveScreen('calendar');
  };
  const loadData = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem(TASKS_KEY);
      const storedNotes = await AsyncStorage.getItem(NOTES_KEY);
      if (storedTasks) setTasks(JSON.parse(storedTasks));
      if (storedNotes) setNotes(JSON.parse(storedNotes));
    } catch (e) { console.log(e); }
  };
  const saveData = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) { console.log(e); }
  };
  const pickEventImages = async () => {
    try {
      const remaining = 3 - eventImages.length;
      if (remaining <= 0) {
        Alert.alert('محدودیت', 'حداکثر ۳ عکس می‌توانید اضافه کنید.');
        return;
      }
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('دسترسی لازم است', 'اجازه دسترسی به گالری را بده.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.7,
      });
      if (!result.canceled) {
        const selected = result.assets.map(asset => asset.uri);
        setEventImages(prev => [...prev, ...selected].slice(0, 3));
      }
    } catch (error) {
      Alert.alert('خطا', 'انتخاب عکس انجام نشد.');
    }
  };
  const pickEventAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled) setEventAudio(result.assets[0]);
    } catch (error) {
      Alert.alert('خطا', 'انتخاب فایل صوتی انجام نشد.');
    }
  };
  const startVoiceRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('دسترسی میکروفون', 'برای ضبط صدا اجازه استفاده از میکروفون را بده.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      recording.setOnRecordingStatusUpdate(status => {
        if (status.isRecording) setRecordingDuration(Math.floor((status.durationMillis || 0) / 1000));
      });
      await recording.startAsync();
      setAudioRecording(recording);
      setIsRecordingAudio(true);
      setRecordingDuration(0);
    } catch (error) {
      Alert.alert('خطا', 'شروع ضبط صدا انجام نشد.');
    }
  };
  const stopVoiceRecording = async () => {
    try {
      if (!audioRecording) return;
      await audioRecording.stopAndUnloadAsync();
      const uri = audioRecording.getURI();
      setEventAudio({ uri, name: 'صدای ضبط‌شده', mimeType: 'audio/m4a' });
      setAudioRecording(null);
      setIsRecordingAudio(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
    } catch (error) {
      Alert.alert('خطا', 'توقف یا ذخیره ضبط انجام نشد.');
    }
  };
  const removeEventImage = (index) => {
    setEventImages(prev => prev.filter((_, i) => i !== index));
  };
  const removeEventAudio = async () => {
    await stopEventAudio();
    setEventAudio(null);
  };
  const playEventAudio = async () => {
    try {
      if (!eventAudio?.uri) return;
      if (audioSound) {
        await audioSound.unloadAsync();
        setAudioSound(null);
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: eventAudio.uri },
        { shouldPlay: true }
      );
      setAudioSound(sound);
      setIsPlayingAudio(true);
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) setIsPlayingAudio(false);
      });
    } catch (error) {
      Alert.alert('خطا', 'پخش فایل صوتی انجام نشد.');
    }
  };
  const stopEventAudio = async () => {
    try {
      if (audioSound) {
        await audioSound.stopAsync();
        await audioSound.unloadAsync();
        setAudioSound(null);
        setIsPlayingAudio(false);
      }
    } catch (error) { console.log(error); }
  };
  const openModal = (type, item = null) => {
    setModalType(type);
    if (type === 'event') {
      if (item) {
        setTitle(item.title);
        setEventType(item.eventType);
        setMainCategory(CATEGORIES[item.mainCategory] ? item.mainCategory : 'خانه');
        setSubCategory(item.subCategory || CATEGORIES['خانه'].subs[0]);
        setIsAllDay(item.isAllDay);
        setHasAlarm(item.hasAlarm);
        setIsEmergency(item.isEmergency || false);
        setRemindOneDayBefore(item.remindOneDayBefore || false);
        setRemindTwoDaysBefore(item.remindTwoDaysBefore || false);
        setEventImages(item.images || []);
        setEventAudio(item.audio || null);
        setEditingId(item.id);
      } else {
        setTitle('');
        setEventType('event');
        setMainCategory('خانه');
        setSubCategory('خرید');
        setIsAllDay(false);
        setHasAlarm(true);
        setIsEmergency(activeScreen === 'emergency');
        setRemindOneDayBefore(false);
        setRemindTwoDaysBefore(false);
        setEventImages([]);
        setEventAudio(null);
        setEditingId(null);
      }
    } else {
      if (item) {
        setNoteContent(item.content);
        setEditingId(item.id);
      } else {
        setNoteContent('');
        setEditingId(null);
      }
    }
    setModalVisible(true);
  };
  const handleSave = async () => {
    if (modalType === 'event') {
      if (!title.trim()) return;
      let scheduledNotificationIds = [];
      if (hasAlarm && !isAllDay) {
        try {
          const permission = await Notifications.getPermissionsAsync();
          let status = permission.status;
          if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
          if (status === 'granted') {
            const offsets = [0, ...(remindOneDayBefore ? [1] : []), ...(remindTwoDaysBefore ? [2] : [])];
            for (const offset of offsets) {
              const when = toLocalDateFromJalali(selectedDate, selectedTime, offset);
              if (when > new Date()) {
                const nid = await Notifications.scheduleNotificationAsync({
                  content: { title: 'یادآوری برنامه', body: `${title} — ${prettyJalaliDate(selectedDate)}، ${selectedTime}`, sound: 'default' },
                  trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when }
                });
                scheduledNotificationIds.push(nid);
              }
            }
          } else Alert.alert('اجازه اعلان', 'برای دریافت آلارم، اجازه اعلان‌ها را در گوشی فعال کنید.');
        } catch (e) { console.log('Notification scheduling error', e); Alert.alert('خطای اعلان', 'زمان‌بندی اعلان انجام نشد. روی گوشی واقعی Expo Go آزمایش کنید.'); }
      }
      if (editingId) {
        const oldTask = tasks.find(t=>t.id===editingId);
        if (oldTask?.notificationIds) for (const nid of oldTask.notificationIds) { try { await Notifications.cancelScheduledNotificationAsync(nid); } catch {} }
      }
      const eventData = {
        id: editingId || Date.now().toString(), notificationIds: scheduledNotificationIds,
        title, eventType, mainCategory, subCategory, isAllDay, hasAlarm, isEmergency,
        remindOneDayBefore, remindTwoDaysBefore,
        date: selectedDate, time: selectedTime,
        images: eventImages,
        audio: eventAudio,
        isCompleted: editingId ? (tasks.find(t => t.id === editingId)?.isCompleted || false) : false,
        completedAt: editingId ? (tasks.find(t => t.id === editingId)?.completedAt || null) : null,
        dayOfWeek: WEEK_DAYS[Math.floor(Math.random() * WEEK_DAYS.length)] // For random chart mapping demo
      };
      if (editingId) {
        setTasks(tasks.map(t => t.id === editingId ? { ...t, ...eventData } : t));
      } else {
        setTasks([eventData, ...tasks]);
      }
    } else {
      if (!noteContent.trim()) return;
      const noteData = {
        id: editingId || Date.now().toString(),
        content: noteContent,
        date: new Intl.DateTimeFormat('fa-IR').format(new Date())
      };
      if (editingId) {
        setNotes(notes.map(n => n.id === editingId ? { ...n, ...noteData } : n));
      } else {
        setNotes([noteData, ...notes]);
      }
    }
    setModalVisible(false);
  };
  const toggleComplete = (id) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        return { 
          ...t, 
          isCompleted: !t.isCompleted, 
          completedAt: !t.isCompleted ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date()) : null 
        };
      }
      return t;
    }));
  };
  const deleteItem = (id, type) => {
    if (type === 'task') setTasks(tasks.filter(t => t.id !== id));
    else setNotes(notes.filter(n => n.id !== id));
  };
  const clearHistory = () => {
    setTasks(tasks.filter(t => !t.isCompleted));
  };
  const activeTasks = tasks.filter(t => !t.isCompleted);
  const emergencyTasks = tasks.filter(t => !t.isCompleted && t.isEmergency);
  const historyTasks = tasks.filter(t => t.isCompleted);
  const getWeeklyStats = () => {
    const counts = { 'شنبه': 0, 'یکشنبه': 0, 'دوشنبه': 0, 'سه‌شنبه': 0, 'چهارشنبه': 0, 'پنجشنبه': 0, 'جمعه': 0 };
    historyTasks.forEach(t => { if (t.dayOfWeek) counts[t.dayOfWeek]++; });
    const max = Math.max(...Object.values(counts), 1); // جلوگیری از تقسیم بر صفر
    return { counts, max };
  };
  const renderEventIcon = (type, isEmerg) => {
    const et = EVENT_TYPES.find(e => e.id === type);
    return <MaterialCommunityIcons name={et?.icon || 'calendar'} size={24} color={isEmerg ? "#EF4444" : "#0EA5E9"} />;
  };
  const renderTaskCard = ({ item }) => (
    <View style={[styles.taskCard, item.isEmergency && styles.taskCardEmergency]}>
      <View style={styles.taskCardHeader}>
        <View style={styles.taskCardHeaderRight}>
          <View style={[styles.iconContainer, item.isEmergency && styles.iconContainerEmergency]}>
            {renderEventIcon(item.eventType, item.isEmergency)}
          </View>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text style={styles.taskTime}>
              {item.isAllDay ? 'تمام روز' : item.time} • {item.mainCategory} ({item.subCategory})
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => toggleComplete(item.id)}>
          <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={28} color="#CBD5E1" />
        </TouchableOpacity>
      </View>
      <View style={styles.taskCardFooter}>
        <View style={styles.badgesRow}>
          {item.isEmergency && (
            <View style={[styles.alarmBadge, { backgroundColor: '#FEF2F2' }]}>
              <Feather name="alert-triangle" size={14} color="#EF4444" />
              <Text style={[styles.alarmText, { color: '#EF4444' }]}>اضطراری</Text>
            </View>
          )}
          {item.remindTwoDaysBefore && (
            <View style={styles.alarmBadge}>
              <Ionicons name="calendar-outline" size={14} color="#0EA5E9" />
              <Text style={[styles.alarmText, { color: '#0EA5E9' }]}>۲ روز قبل</Text>
            </View>
          )}
          {item.remindOneDayBefore && (
            <View style={styles.alarmBadge}>
              <Ionicons name="calendar-outline" size={14} color="#F59E0B" />
              <Text style={[styles.alarmText, { color: '#F59E0B' }]}>۱ روز قبل</Text>
            </View>
          )}
          {item.hasAlarm && (
            <View style={styles.alarmBadge}>
              <Ionicons name="notifications-outline" size={14} color="#64748B" />
              <Text style={styles.alarmText}>در زمان</Text>
            </View>
          )}
        </View>
        <View style={styles.actionBtns}>
          <TouchableOpacity onPress={() => openModal('event', item)} style={styles.actionBtn}>
            <Feather name="edit-2" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  const renderCustomWeeklyChart = () => {
    const { counts, max } = getWeeklyStats();
    return (
      <View style={styles.chartWrapper}>
        <View style={styles.customChartCard}>
          <View style={styles.chartHeader}>
            <TouchableOpacity><Feather name="refresh-ccw" size={20} color="white" /></TouchableOpacity>
            <View>
              <Text style={styles.chartMainTitle}>چند چندیم !؟</Text>
              <Text style={styles.chartSubTitle}>هفت روزی که گذشت ...</Text>
            </View>
          </View>
          <View style={styles.barsContainer}>
            {WEEK_DAYS.map(day => {
              const heightPercent = counts[day] > 0 ? (counts[day] / max) * 100 : 15; // Minimum height for visual
              return (
                <View key={day} style={styles.barCol}>
                  <View style={styles.barBackground}>
                    <View style={[styles.barFill, { height: `${heightPercent}%` }]} />
                  </View>
                  <Text style={styles.barLabel}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>
        <View style={styles.chartInfoBox}>
          <Text style={styles.chartInfoTitle}>هفته نامه مالی</Text>
          <Text style={styles.chartInfoText}>
            در این نمودار، عملکرد مالی هفته گذشته را به‌صورت کلی مشاهده می‌کنید. مجموع دخل و خرج هر روز در نمایی ساده نشان داده شده تا بتوانید روند کلی مالی خود را مرور کنید.
          </Text>
          <Text style={styles.chartInfoText}>
            برای مشاهده اطلاعات هر روز، کافیست دستتان را روی روز مورد نظر نگه دارید. با این کار، جزئیات دخل، خرج و مجموع برای آن روز نمایش داده می‌شود.
          </Text>
        </View>
      </View>
    );
  };
  if (isCheckingAuth) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.authKeyboard}>
          <View style={styles.authBox}>
            <View style={styles.authLogo}>
              <MaterialCommunityIcons name="shield-account-outline" size={64} color="#0EA5E9" />
            </View>
            <Text style={styles.authTitle}>
              {authMode === 'register' ? 'راه‌اندازی اپلیکیشن' : `خوش آمدید، ${storedAuth?.username}`}
            </Text>
            <Text style={styles.authSub}>
              {authMode === 'register' 
                ? 'برای امنیت اطلاعات، یک نام کاربری و رمز عبور دلخواه وارد کنید.' 
                : 'برای ورود به اپلیکیشن رمز عبور خود را وارد کنید یا از اثر انگشت استفاده کنید.'}
            </Text>
            {authError ? <Text style={styles.authError}>{authError}</Text> : null}
            {authMode === 'register' && (
              <TextInput
                style={styles.authInput}
                placeholder="نام کاربری"
                placeholderTextColor="#94A3B8"
                value={usernameInput}
                onChangeText={setUsernameInput}
                textAlign="right"
                autoCapitalize="none"
              />
            )}
            <TextInput
              style={styles.authInput}
              placeholder="رمز عبور"
              placeholderTextColor="#94A3B8"
              value={passwordInput}
              onChangeText={setPasswordInput}
              secureTextEntry
              textAlign="right"
            />
            <View style={styles.authActionRow}>
              {authMode === 'login' && isBiometricSupported && (
                <TouchableOpacity style={styles.fingerprintBtn} onPress={handleBiometricAuth}>
                  <Ionicons name="finger-print" size={32} color="#0EA5E9" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.authBtn, authMode === 'login' && isBiometricSupported && { flex: 1, marginLeft: 16 }]} onPress={handleAuthenticate}>
                <Text style={styles.authBtnText}>
                  {authMode === 'register' ? 'ثبت و ورود' : 'ورود'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }
  const getHeaderTitle = () => {
    switch (activeScreen) {
      case 'calendar': return 'رویداد و وظایف';
      case 'emergency': return 'موارد اضطراری';
      case 'notes': return 'دفترچه یادداشت';
      case 'history': return 'تاریخچه و آمار';
      default: return '';
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.mainHeader}>
        <View style={styles.headerLeftContainer}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Feather name="log-out" size={20} color="#EF4444" />
          </TouchableOpacity>
          {activeScreen === 'history' && historyTasks.length > 0 && (
            <TouchableOpacity style={styles.clearHistoryBtn} onPress={clearHistory}>
              <Text style={styles.clearHistoryText}>پاکسازی</Text>
              <Feather name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
        <View>
          <Text style={styles.mainHeaderTitle}>{getHeaderTitle()}</Text>
          <Text style={styles.mainHeaderSub}>امروز: ۲۶ آبان ۱۴۰۵</Text>
        </View>
      </View>
      <View style={styles.contentArea}>
        {activeScreen === 'calendar' && (
          <FlatList
            data={activeTasks}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            renderItem={renderTaskCard}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="calendar-blank-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>هیچ رویدادی ندارید</Text>
              </View>
            }
          />
        )}
        {activeScreen === 'emergency' && (
          <FlatList
            data={emergencyTasks}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            renderItem={renderTaskCard}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="shield" size={64} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>مورد اضطراری ثبت نشده است</Text>
              </View>
            }
          />
        )}
        {activeScreen === 'notes' && (
          <FlatList
            data={notes}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <View style={styles.noteCard}>
                <Text style={styles.noteContent}>{item.content}</Text>
                <View style={styles.noteFooter}>
                  <Text style={styles.noteDate}>{item.date}</Text>
                  <View style={styles.actionBtns}>
                    <TouchableOpacity onPress={() => openModal('note', item)} style={styles.actionBtn}>
                      <Feather name="edit-2" size={14} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteItem(item.id, 'note')} style={[styles.actionBtn, styles.deleteBtn]}>
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="file-text" size={64} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>یادداشتی ثبت نشده است</Text>
              </View>
            }
          />
        )}
        {activeScreen === 'history' && (
          <FlatList
            ListHeaderComponent={renderCustomWeeklyChart}
            data={historyTasks}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <View style={[styles.taskCard, styles.taskCardCompleted]}>
                <View style={styles.taskCardHeader}>
                  <View style={styles.taskCardHeaderRight}>
                    <View style={[styles.iconContainer, { backgroundColor: '#F1F5F9' }]}>
                      <MaterialCommunityIcons name="check" size={24} color="#10B981" />
                    </View>
                    <View style={styles.taskInfo}>
                      <Text style={[styles.taskTitle, styles.textCompleted]}>{item.title}</Text>
                      <Text style={styles.taskTime}>انجام شده: {item.completedAt}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => toggleComplete(item.id)}>
                    <MaterialCommunityIcons name="backup-restore" size={28} color="#0EA5E9" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="history" size={64} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>تاریخچه خالی است</Text>
              </View>
            }
          />
        )}
      </View>
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveScreen('calendar')}>
          <Feather name="calendar" size={22} color={activeScreen === 'calendar' ? '#0EA5E9' : '#94A3B8'} />
          <Text style={[styles.navText, activeScreen === 'calendar' && styles.navTextActive]}>رویداد</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveScreen('emergency')}>
          <Feather name="alert-triangle" size={22} color={activeScreen === 'emergency' ? '#EF4444' : '#94A3B8'} />
          <Text style={[styles.navText, activeScreen === 'emergency' && { color: '#EF4444', fontWeight: '700' }]}>اضطراری</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveScreen('notes')}>
          <Feather name="file-text" size={22} color={activeScreen === 'notes' ? '#0EA5E9' : '#94A3B8'} />
          <Text style={[styles.navText, activeScreen === 'notes' && styles.navTextActive]}>یادداشت</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveScreen('history')}>
          <Feather name="pie-chart" size={22} color={activeScreen === 'history' ? '#0EA5E9' : '#94A3B8'} />
          <Text style={[styles.navText, activeScreen === 'history' && styles.navTextActive]}>تاریخچه</Text>
        </TouchableOpacity>
      </View>
      {activeScreen !== 'history' && (
        <TouchableOpacity 
          style={[styles.fab, activeScreen === 'emergency' && { backgroundColor: '#EF4444', shadowColor: '#EF4444' }]} 
          onPress={() => openModal(activeScreen === 'notes' ? 'note' : 'event')} 
          activeOpacity={0.8}>
          <Feather name="plus" size={32} color="white" />
        </TouchableOpacity>
      )}
      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleSave} style={styles.headerSaveBtn}>
              <Feather name="check" size={28} color="#0EA5E9" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingId ? 'ویرایش' : 'جدید'} {modalType === 'event' ? 'رویداد' : 'یادداشت'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.headerCloseBtn}>
              <Feather name="x" size={28} color="#64748B" />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {modalType === 'event' ? (
                <>
                  <View style={styles.inputSection}>
                    <TextInput
                      style={styles.mainInput}
                      placeholder="عنوان رویداد..."
                      placeholderTextColor="#94A3B8"
                      value={title}
                      onChangeText={setTitle}
                      textAlign="right"
                    />
                  </View>
                  <View style={styles.settingBlock}>
                    <View style={styles.settingRow}>
                      <Switch value={isEmergency} onValueChange={setIsEmergency} trackColor={{ true: '#EF4444', false: '#E2E8F0' }} />
                      <Text style={styles.settingLabel}>رویداد اضطراری (اولویت بالا)</Text>
                    </View>
                  </View>
                  <View style={styles.settingBlock}>
                    <View style={styles.settingRow}>
                      <Switch value={isAllDay} onValueChange={setIsAllDay} trackColor={{ true: '#0EA5E9', false: '#E2E8F0' }} />
                      <Text style={styles.settingLabel}>تمام روز (All day)</Text>
                    </View>
                    {!isAllDay && (
                      <View style={styles.dateTimeRow}>
                        <View style={styles.dateTimeField}>
                          <Text style={styles.dateTimeToText}>ساعت</Text>
                          <TouchableOpacity style={styles.dateTimeInput} onPress={() => { setTimePickerStep('hour'); setShowTimePicker(true); }}><Text style={styles.pickerFieldText}>{selectedTime}</Text></TouchableOpacity>
                        </View>
                        <View style={styles.dateTimeField}>
                          <Text style={styles.dateTimeToText}>تاریخ</Text>
                          <TouchableOpacity style={styles.dateTimeInput} onPress={() => { setPickerMonth(8); setPickerYear(1405); setShowDatePicker(true); }}><Text style={styles.pickerFieldText}>{prettyJalaliDate(selectedDate)}</Text></TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                  <View style={styles.categorySection}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryTitle}>دسته‌بندی</Text>
                      <Text style={styles.categoryHint}>نوع فعالیت را انتخاب کنید</Text>
                    </View>
                    <View style={styles.categoryGrid}>
                      {Object.keys(CATEGORIES).map(cat => {
                        const selected = mainCategory === cat;
                        const category = CATEGORIES[cat];
                        return (
                          <TouchableOpacity key={cat} activeOpacity={0.8}
                            style={[styles.categoryCard, selected && { borderColor: category.color, backgroundColor: category.color + '12' }]}
                            onPress={() => { setMainCategory(cat); setSubCategory(category.subs[0]); }}>
                            <View style={[styles.categoryIconBox, { backgroundColor: category.color + '18' }]}>
                              <MaterialCommunityIcons name={category.icon} size={28} color={category.color} />
                            </View>
                            <Text style={[styles.categoryCardText, selected && { color: category.color }]}>{cat}</Text>
                            {selected && <View style={[styles.categoryCheck, { backgroundColor: category.color }]}><Feather name="check" size={12} color="white" /></View>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={styles.subCategoryHeader}>
                      <Text style={styles.subCategoryTitle}>زیرمجموعه</Text>
                      <View style={[styles.selectedCategoryBadge, { backgroundColor: (CATEGORIES[mainCategory] || CATEGORIES['خانه']).color + '18' }]}>
                        <Text style={[styles.selectedCategoryText, { color: (CATEGORIES[mainCategory] || CATEGORIES['خانه']).color }]}>{mainCategory}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.subCategoryDropdown} onPress={() => setSubCategoryOpen(v => !v)} activeOpacity={0.8}>
                      <Text style={styles.subCategoryDropdownText}>{subCategory || 'انتخاب زیرمجموعه'}</Text>
                      <Feather name={subCategoryOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#64748B" />
                    </TouchableOpacity>
                    {subCategoryOpen && (
                      <View style={styles.subCategoryOptions}>
                        {(CATEGORIES[mainCategory] || CATEGORIES['خانه']).subs.map(sub => (
                          <TouchableOpacity key={sub} style={styles.subCategoryOption} onPress={() => { setSubCategory(sub); setSubCategoryOpen(false); }}>
                            <Text style={styles.subCategoryCardText}>{sub}</Text>
                            {subCategory === sub && <Feather name="check" size={16} color={(CATEGORIES[mainCategory] || CATEGORIES['خانه']).color} />}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={styles.settingBlock}>
                    <Text style={styles.sectionTitle}>تصاویر رویداد (حداکثر ۳ عکس)</Text>
                    <TouchableOpacity onPress={pickEventImages} style={styles.mediaAddBtn}>
                      <Feather name="image" size={20} color="#0EA5E9" />
                      <Text style={styles.mediaAddText}>افزودن عکس از گالری</Text>
                    </TouchableOpacity>
                    <View style={styles.imagesPreviewContainer}>
                      {eventImages.map((uri, index) => (
                        <View key={index} style={styles.imagePreviewBox}>
                          <Image source={{ uri }} style={styles.eventPreviewImage} />
                          <TouchableOpacity onPress={() => removeEventImage(index)} style={styles.removeMediaBtn}>
                            <Feather name="x" size={16} color="white" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={styles.settingBlock}>
                    <Text style={styles.sectionTitle}>فایل صوتی رویداد</Text>
                    <TouchableOpacity onPress={isRecordingAudio ? stopVoiceRecording : startVoiceRecording} style={[styles.mediaAddBtn, isRecordingAudio && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                      <Feather name={isRecordingAudio ? 'square' : 'mic'} size={20} color={isRecordingAudio ? '#EF4444' : '#8B5CF6'} />
                      <Text style={[styles.mediaAddText, { color: isRecordingAudio ? '#EF4444' : '#8B5CF6' }]}>{isRecordingAudio ? `توقف ضبط  •  ${Math.floor(recordingDuration / 60)}:${String(recordingDuration % 60).padStart(2, '0')}` : 'ضبط پیام صوتی'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickEventAudio} style={[styles.mediaAddBtn, { marginTop: 8 }]}>
                      <Feather name="folder" size={20} color="#64748B" />
                      <Text style={[styles.mediaAddText, { color: '#64748B' }]}>یا انتخاب فایل از گوشی</Text>
                    </TouchableOpacity>
                    {eventAudio && (
                      <View style={styles.audioPreviewBox}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.audioFileName} numberOfLines={2}>
                            {eventAudio.name || 'فایل صوتی'}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={isPlayingAudio ? stopEventAudio : playEventAudio} style={styles.audioPlayBtn}>
                          <Feather name={isPlayingAudio ? 'square' : 'play'} size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={removeEventAudio} style={styles.removeAudioBtn}>
                          <Feather name="trash-2" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <View style={styles.settingBlock}>
                    <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>تنظیمات یادآوری</Text>
                    <View style={styles.settingRow}>
                      <Switch value={remindTwoDaysBefore} onValueChange={setRemindTwoDaysBefore} trackColor={{ true: '#0EA5E9', false: '#E2E8F0' }} />
                      <Text style={styles.settingLabel}>یادآوری ۲ روز قبل</Text>
                    </View>
                    <View style={styles.settingRow}>
                      <Switch value={remindOneDayBefore} onValueChange={setRemindOneDayBefore} trackColor={{ true: '#F59E0B', false: '#E2E8F0' }} />
                      <Text style={styles.settingLabel}>یادآوری ۱ روز قبل</Text>
                    </View>
                    <View style={styles.settingRow}>
                      <Switch value={hasAlarm} onValueChange={setHasAlarm} trackColor={{ true: '#10B981', false: '#E2E8F0' }} />
                      <Text style={styles.settingLabel}>آلارم در زمان رویداد</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.inputSection}>
                  <TextInput
                    style={[styles.mainInput, { height: 250, textAlignVertical: 'top' }]}
                    placeholder="شروع به نوشتن کنید..."
                    placeholderTextColor="#94A3B8"
                    value={noteContent}
                    onChangeText={setNoteContent}
                    multiline
                    textAlign="right"
                    autoFocus
                  />
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}><View style={styles.pickerPanel}>
          <View style={styles.pickerHeader}><TouchableOpacity onPress={() => setPickerMonth(m => m===1?12:m-1)}><Text style={styles.pickerNav}>‹</Text></TouchableOpacity><Text style={styles.pickerTitle}>{['','فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'][pickerMonth]} {pickerYear}</Text><TouchableOpacity onPress={() => setPickerMonth(m => m===12?1:m+1)}><Text style={styles.pickerNav}>›</Text></TouchableOpacity></View>
          <View style={styles.pickerDays}>{Array.from({length:31},(_,i)=>i+1).map(d=><TouchableOpacity key={d} style={[styles.pickerDay, selectedDate.endsWith(String(d).padStart(2,'0')) && styles.pickerDayActive]} onPress={()=>{const fa=n=>String(n).replace(/[0-9]/g,x=>'۰۱۲۳۴۵۶۷۸۹'[x]);setSelectedDate(`${fa(pickerYear)}/${fa(pickerMonth).padStart(2,'۰')}/${fa(d).padStart(2,'۰')}`);setShowDatePicker(false);}}><Text style={[styles.pickerDayText, selectedDate.endsWith(String(d).padStart(2,'0')) && styles.pickerDayTextActive]}>{d}</Text></TouchableOpacity>)}</View>
          <TouchableOpacity style={styles.pickerDone} onPress={()=>setShowDatePicker(false)}><Text style={styles.pickerDoneText}>بستن</Text></TouchableOpacity>
        </View></View>
      </Modal>
      <Modal visible={showTimePicker} transparent animationType="fade">
        <View style={styles.pickerOverlay}><View style={styles.pickerPanel}>
          <Text style={styles.pickerTitle}>{timePickerStep==='hour'?'انتخاب ساعت':'انتخاب دقیقه'}</Text>
          <View style={styles.clockDial}>
            <View style={styles.clockCenter}><Text style={styles.clockCenterText}>{selectedTime}</Text></View>
            {Array.from({length:timePickerStep==='hour'?12:12},(_,i)=>i).map(i=>{
              const val=timePickerStep==='hour'?(i===0?12:i):(i*5); const display=timePickerStep==='hour'?String(val):String(val).padStart(2,'0');
              const angle=(i*30-90)*Math.PI/180; const left=110+88*Math.cos(angle)-22; const top=110+88*Math.sin(angle)-22;
              const active=timePickerStep==='hour'?selectedTime.startsWith(String(val===12?'00':val).padStart(2,'0')):selectedTime.endsWith(display);
              return <TouchableOpacity key={i} style={[styles.clockNumber,{left,top},active&&styles.clockNumberActive]} onPress={()=>{if(timePickerStep==='hour'){const h=val===12?0:val;setSelectedTime(`${String(h).padStart(2,'0')}:${selectedTime.split(':')[1]||'00'}`);setTimePickerStep('minute');}else{setSelectedTime(`${selectedTime.split(':')[0]}:${display}`);}}}><Text style={[styles.clockNumberText,active&&styles.clockNumberTextActive]}>{display}</Text></TouchableOpacity>;
            })}
          </View>
          <TouchableOpacity style={styles.pickerDone} onPress={()=>{if(timePickerStep==='hour')setTimePickerStep('minute');else setShowTimePicker(false);}}><Text style={styles.pickerDoneText}>{timePickerStep==='hour'?'ادامه: انتخاب دقیقه':'تأیید ساعت '+selectedTime}</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  authContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  authKeyboard: { flex: 1, justifyContent: 'center', padding: 24 },
  authBox: { backgroundColor: 'white', padding: 32, borderRadius: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, alignItems: 'center' },
  authLogo: { width: 96, height: 96, backgroundColor: '#F0F9FF', borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  authTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  authSub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  authError: { color: '#EF4444', marginBottom: 16, fontSize: 14, textAlign: 'center', backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, width: '100%' },
  authInput: { width: '100%', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, fontSize: 16, color: '#0F172A', marginBottom: 16 },
  authActionRow: { flexDirection: 'row-reverse', width: '100%', marginTop: 8, alignItems: 'center' },
  authBtn: { width: '100%', backgroundColor: '#0EA5E9', padding: 16, borderRadius: 16, alignItems: 'center' },
  authBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  fingerprintBtn: { backgroundColor: '#F0F9FF', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD' },
  mainHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: Platform.OS === 'android' ? 40 : 24 },
  headerLeftContainer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  logoutBtn: { width: 40, height: 40, backgroundColor: '#FEF2F2', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  mainHeaderTitle: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', textAlign: 'right' },
  mainHeaderSub: { fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'right' },
  clearHistoryBtn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 4 },
  clearHistoryText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  contentArea: { flex: 1 },
  listContainer: { padding: 20, paddingBottom: 100 },
  chartWrapper: { marginBottom: 24 },
  customChartCard: { backgroundColor: '#EF4444', borderRadius: 20, padding: 20, elevation: 4, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  chartHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  chartMainTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', textAlign: 'right', marginBottom: 4 },
  chartSubTitle: { fontSize: 14, color: '#FECACA', textAlign: 'right' },
  barsContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-end', height: 150, paddingHorizontal: 10 },
  barCol: { alignItems: 'center', width: '12%' },
  barBackground: { width: 14, height: 120, backgroundColor: '#FCA5A5', borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: 8 },
  barFill: { width: '100%', backgroundColor: 'white', borderRadius: 7 },
  barLabel: { color: 'white', fontSize: 10, fontWeight: '600' },
  chartInfoBox: { marginTop: -15, backgroundColor: 'white', borderRadius: 20, padding: 20, paddingTop: 30, elevation: 2, zIndex: -1 },
  chartInfoTitle: { fontSize: 18, fontWeight: 'bold', color: '#F59E0B', textAlign: 'right', marginBottom: 12 },
  chartInfoText: { fontSize: 13, color: '#64748B', textAlign: 'right', lineHeight: 22, marginBottom: 8 },
  taskCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  taskCardEmergency: { borderRightWidth: 4, borderRightColor: '#EF4444' },
  taskCardCompleted: { backgroundColor: '#F8FAFC', opacity: 0.8 },
  taskCardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  taskCardHeaderRight: { flexDirection: 'row-reverse', flex: 1, gap: 12 },
  iconContainer: { width: 48, height: 48, backgroundColor: '#F0F9FF', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  iconContainerEmergency: { backgroundColor: '#FEF2F2' },
  taskInfo: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 4, textAlign: 'right' },
  textCompleted: { textDecorationLine: 'line-through', color: '#94A3B8' },
  taskTime: { fontSize: 13, color: '#64748B' },
  taskCardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  badgesRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, flex: 1, marginLeft: 10 },
  alarmBadge: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  alarmText: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  actionBtns: { flexDirection: 'row-reverse', gap: 12, alignItems: 'center' },
  actionBtn: { padding: 8, backgroundColor: '#F8FAFC', borderRadius: 8 },
  deleteBtn: { backgroundColor: '#FEF2F2' },
  noteCard: { backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, borderLeftWidth: 4, borderLeftColor: '#FBBF24' },
  noteContent: { fontSize: 16, color: '#334155', textAlign: 'right', lineHeight: 26, marginBottom: 12 },
  noteFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#FEF3C7', paddingTop: 12 },
  noteDate: { fontSize: 12, color: '#94A3B8' },
  fab: { position: 'absolute', bottom: 90, right: 32, backgroundColor: '#0EA5E9', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, zIndex: 10 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyStateText: { marginTop: 16, fontSize: 16, color: '#94A3B8' },
  bottomNav: { flexDirection: 'row-reverse', backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  navItem: { flex: 1, alignItems: 'center', gap: 4 },
  navText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  navTextActive: { color: '#0EA5E9', fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#F1F5F9' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  headerSaveBtn: { padding: 4 },
  headerCloseBtn: { padding: 4 },
  modalScroll: { padding: 16 },
  typeTabsContainer: { display: 'none' },
  typeTab: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 8 },
  typeTabActive: { borderBottomWidth: 2, borderBottomColor: '#0EA5E9' },
  typeTabText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  typeTabTextActive: { color: '#0EA5E9' },
  inputSection: { backgroundColor: 'white', borderRadius: 16, marginBottom: 16 },
  mainInput: { fontSize: 18, color: '#0F172A', padding: 20, fontWeight: '500' },
  settingBlock: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16 },
  settingRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  settingLabel: { fontSize: 16, color: '#1E293B' },
  dateTimeRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  dateTimeField: { flex: 1, alignItems: 'flex-end' },
  dateTimeInput: { width: '100%', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  pickerFieldText: { textAlign: 'center', fontSize: 16, color: '#0F172A' },
  pickerOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', padding:18 },
  pickerPanel: { backgroundColor:'#fff', borderRadius:20, padding:18, maxHeight:'85%' },
  pickerHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
  pickerTitle: { fontSize:17, fontWeight:'bold', color:'#0F172A', textAlign:'center', marginVertical:8 },
  pickerNav: { fontSize:30, color:'#0EA5E9', paddingHorizontal:12 },
  pickerDays: { flexDirection:'row', flexWrap:'wrap', justifyContent:'center' },
  pickerDay: { width:'14%', aspectRatio:1, alignItems:'center', justifyContent:'center', borderRadius:12, margin:2 },
  pickerDayActive: { backgroundColor:'#0EA5E9', borderRadius:10 },
  pickerDayText: { color:'#334155', fontSize:15 },
  pickerDayTextActive: { color:'#fff', fontWeight:'bold' },
  clockDial: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#F1F5F9', alignSelf: 'center', marginVertical: 10, position: 'relative' },
  clockCenter: { position: 'absolute', width: 66, height: 66, borderRadius: 33, left: 77, top: 77, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  clockCenterText: { fontSize: 18, fontWeight: 'bold', color: '#1D4ED8' },
  clockNumber: { position: 'absolute', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  clockNumberActive: { backgroundColor: '#0EA5E9' },
  clockNumberText: { fontSize: 15, color: '#334155' },
  clockNumberTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  timeOptions: { flexDirection:'row', flexWrap:'wrap', justifyContent:'center', marginVertical:8 },
  timeOption: { width:'16%', paddingVertical:12, alignItems:'center', borderRadius:10, margin:2 },
  pickerDone: { backgroundColor:'#0EA5E9', padding:14, borderRadius:12, alignItems:'center', marginTop:12 },
  pickerDoneText: { color:'#fff', fontWeight:'bold' },
  dateTimeBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  dateTimeText: { fontSize: 15, color: '#0F172A', fontWeight: '500' },
  dateTimeToText: { fontSize: 14, color: '#94A3B8' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 12, textAlign: 'right' },
  categorySection: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  categoryHeader: { alignItems: 'flex-end', marginBottom: 18 },
  categoryTitle: { fontSize: 19, fontWeight: 'bold', color: '#0F172A', textAlign: 'right' },
  categoryHint: { fontSize: 12, color: '#94A3B8', marginTop: 6, textAlign: 'right' },
  categoryGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  categoryCard: { width: '47.5%', minHeight: 105, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 18, padding: 14, alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative' },
  categoryIconBox: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  categoryCardText: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginTop: 10, textAlign: 'right' },
  categoryCheck: { position: 'absolute', left: 10, top: 10, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  subCategoryHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 14 },
  subCategoryTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  selectedCategoryBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  selectedCategoryText: { fontSize: 12, fontWeight: 'bold' },
  subCategoryScroll: { maxHeight: 230, borderRadius: 14, paddingBottom: 4 },
  subCategoryDropdown: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14 },
  subCategoryDropdownText: { color: '#334155', fontSize: 15 },
  subCategoryOptions: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, marginTop: 8, maxHeight: 230 },
  subCategoryOption: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 13, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  subCategoryGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, paddingBottom: 6 },
  subCategoryCard: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  subCategoryCardText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  calendarContainer: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 20 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calendarMonthText: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  weekDayText: { width: '14.28%', textAlign: 'center', fontSize: 11, color: '#64748B', fontWeight: 'bold' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', width: '100%' },
  dayCell: { width: '14.28%', height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginBottom: 4 },
  dayCellSelected: { backgroundColor: '#0EA5E9' },
  dayText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  dayTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },
  dayDots: { flexDirection: 'row', justifyContent: 'center', marginTop: 3 },
  dot: { width: 5, height: 5, borderRadius: 5, backgroundColor: '#F59E0B' }
});