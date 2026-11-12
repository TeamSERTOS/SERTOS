
import { useEffect, useRef, useState } from 'react'
import {
    Activity,
    Ambulance,
    Bell,
    Camera,
    ChevronDown,
    ChevronRight,
    Clock3,
    Hospital,
    House,
    MapPin,
    Mic,
    Route,
    Save,
    ShieldCheck,
    Trash2,
    UserRound,
    Wifi,
    X,
    Pencil,
    Phone,
} from 'lucide-react'

// ==============================
// TYPES
// ==============================

type SpeechResult = {
    0: { transcript: string }
}

type SpeechEvent = {
    results: ArrayLike<SpeechResult>
}

type SpeechRecognitionLike = {
    lang: string
    interimResults: boolean
    onresult: ((event: SpeechEvent) => void) | null
    onerror: (() => void) | null
    onend: (() => void) | null
    start: () => void
    stop: () => void
}

type SpeechWindow = Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

type DriverProfile = {
    name: string
    phone: string
    age: string
    ambulanceNumber: string
    photo: string
}

const STORAGE_KEY = 'sertos_driver_profile'

const DEFAULT_PROFILE: DriverProfile = {
    name: 'Ambulance Driver',
    phone: '',
    age: '',
    ambulanceNumber: 'AMB-001',
    photo: '',
}

// ==============================
// MAIN COMPONENT
// ==============================

function DriverPage() {

    // Navigation
    const [activeTab, setActiveTab] = useState('home')

    // Voice reporting
    const [listening, setListening] = useState(false)
    const [patientReport, setPatientReport] = useState('')
    const [showDetails, setShowDetails] = useState(false)
    const [voiceMessage, setVoiceMessage] = useState('')

    const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

    // Driver profile
    const [driverProfile, setDriverProfile] = useState<DriverProfile>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            return saved
                ? { ...DEFAULT_PROFILE, ...JSON.parse(saved) }
                : DEFAULT_PROFILE
        } catch {
            return DEFAULT_PROFILE
        }
    })

    const [draftProfile, setDraftProfile] = useState<DriverProfile>(
        DEFAULT_PROFILE
    )

    const [editProfile, setEditProfile] = useState(false)

    // Camera
    const [cameraOpen, setCameraOpen] = useState(false)
    const [cameraError, setCameraError] = useState('')

    const videoRef = useRef<HTMLVideoElement | null>(null)
    const cameraStreamRef = useRef<MediaStream | null>(null)

    // ==============================
    // CAMERA FUNCTIONS
    // ==============================

    const stopCamera = () => {
        cameraStreamRef.current?.getTracks().forEach(track => track.stop())

        cameraStreamRef.current = null

        setCameraOpen(false)
    }

    const startCamera = async () => {
        try {
            setCameraError('')

            if (!navigator.mediaDevices?.getUserMedia) {
                setCameraError(
                    'Camera requires HTTPS or localhost. Please open the app in a supported browser.'
                )
                setCameraOpen(true)
                return
            }

            cameraStreamRef.current?.getTracks().forEach(track => track.stop())

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 720 },
                    height: { ideal: 720 },
                },
                audio: false,
            })

            cameraStreamRef.current = stream
            setCameraOpen(true)

        } catch (error) {
            console.error('Camera error:', error)

            setCameraError(
                'Unable to access camera. Please allow camera permission and try again.'
            )

            setCameraOpen(true)
        }
    }

    // Attach camera stream after video element renders
    useEffect(() => {
        if (cameraOpen && videoRef.current && cameraStreamRef.current) {
            videoRef.current.srcObject = cameraStreamRef.current

            videoRef.current.play().catch(error => {
                console.error('Camera playback error:', error)
                setCameraError('Unable to start camera preview.')
            })
        }
    }, [cameraOpen, cameraError])

    const capturePhoto = () => {
        const video = videoRef.current

        if (!video || video.videoWidth === 0) {
            setCameraError('Camera is not ready. Please try again.')
            return
        }

        const canvas = document.createElement('canvas')

        // Resize image to reduce storage usage
        const size = 480

        canvas.width = size
        canvas.height = size

        const context = canvas.getContext('2d')

        if (!context) return

        // Center crop for profile picture
        const cropSize = Math.min(video.videoWidth, video.videoHeight)

        const cropX = (video.videoWidth - cropSize) / 2
        const cropY = (video.videoHeight - cropSize) / 2

        context.drawImage(
            video,
            cropX,
            cropY,
            cropSize,
            cropSize,
            0,
            0,
            size,
            size
        )

        const photo = canvas.toDataURL('image/jpeg', 0.75)

        setDraftProfile(prev => ({
            ...prev,
            photo,
        }))

        stopCamera()

        setVoiceMessage('Profile photo captured successfully.')
    }

    // Stop camera when leaving component
    useEffect(() => {
        return () => {
            cameraStreamRef.current?.getTracks().forEach(track => track.stop())
        }
    }, [])

    // ==============================
    // PROFILE FUNCTIONS
    // ==============================

    const openEditProfile = () => {
        setDraftProfile({ ...driverProfile })
        setEditProfile(true)
    }

    const cancelEditProfile = () => {
        stopCamera()
        setDraftProfile({ ...driverProfile })
        setEditProfile(false)
    }

    const updateProfileField = (
        field: keyof DriverProfile,
        value: string
    ) => {
        setDraftProfile(prev => ({
            ...prev,
            [field]: value,
        }))
    }

    const removePhoto = () => {
        setDraftProfile(prev => ({
            ...prev,
            photo: '',
        }))
    }

    const saveDriverProfile = () => {

        if (!draftProfile.name.trim()) {
            setVoiceMessage('Please enter driver name.')
            return
        }

        if (!/^[0-9]{10}$/.test(draftProfile.phone)) {
            setVoiceMessage('Please enter a valid 10-digit phone number.')
            return
        }

        const age = Number(draftProfile.age)

        if (
            !draftProfile.age ||
            !Number.isInteger(age) ||
            age < 18 ||
            age > 100
        ) {
            setVoiceMessage('Please enter a valid age between 18 and 100.')
            return
        }

        if (!draftProfile.ambulanceNumber.trim()) {
            setVoiceMessage('Please enter ambulance registration number.')
            return
        }

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(draftProfile)
            )

            setDriverProfile({ ...draftProfile })
            setEditProfile(false)

            setVoiceMessage('Driver profile saved successfully.')

        } catch (error) {
            console.error('Profile storage error:', error)
            setVoiceMessage(
                'Unable to save profile. Browser storage may be full.'
            )
        }
    }

    // ==============================
    // VOICE REPORTING
    // ==============================

    const startVoiceReport = () => {

        if (listening) {
            recognitionRef.current?.stop()
            setListening(false)
            return
        }

        const speechWindow = window as SpeechWindow

        const SpeechRecognition =
            speechWindow.SpeechRecognition ||
            speechWindow.webkitSpeechRecognition

        if (!SpeechRecognition) {
            setVoiceMessage(
                'Voice recognition is not supported. Please use Chrome.'
            )
            return
        }

        const recognition = new SpeechRecognition()

        recognition.lang = 'en-IN'
        recognition.interimResults = false

        recognition.onresult = event => {
            const transcript = event.results[0][0].transcript

            setPatientReport(transcript)
            setShowDetails(false)

            setVoiceMessage('Voice report captured successfully.')
        }

        recognition.onerror = () => {
            setVoiceMessage('Unable to capture voice. Please try again.')
            setListening(false)
        }

        recognition.onend = () => {
            setListening(false)
        }

        recognitionRef.current = recognition

        setListening(true)
        setVoiceMessage('Listening to patient details...')

        try {
            recognition.start()
        } catch {
            setListening(false)
            setVoiceMessage('Unable to start microphone. Please try again.')
        }
    }

    // ==============================
    // HOME PAGE
    // ==============================

    const renderHome = () => (
        <>

            {/* Patient Report */}

            {patientReport && (
                <section className="bg-white border border-blue-100 rounded-2xl shadow-sm overflow-hidden">

                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="w-full p-4 flex items-center gap-3 text-left"
                    >

                        <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
                            <Activity size={23} />
                        </div>

                        <div className="flex-1 min-w-0">

                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm">
                                    Patient Report
                                </h3>

                                <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-full font-semibold">
                                    CAPTURED
                                </span>
                            </div>

                            <p className="text-xs text-slate-500 mt-1 truncate">
                                {patientReport}
                            </p>

                        </div>

                        {showDetails
                            ? <ChevronDown size={20} />
                            : <ChevronRight size={20} />
                        }

                    </button>

                    {showDetails && (
                        <div className="border-t border-slate-100 p-4 space-y-3">

                            <p className="text-xs text-slate-500 font-semibold uppercase">
                                Recorded patient information
                            </p>

                            <p className="text-sm text-slate-700 leading-6">
                                {patientReport}
                            </p>

                            <div className="bg-amber-50 text-amber-800 rounded-xl p-3 text-xs leading-5">
                                This report is currently stored only in this screen.
                                Backend forwarding will be implemented later.
                            </div>

                        </div>
                    )}

                </section>
            )}

            {/* Emergency Status */}

            <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">

                <div className="flex justify-between items-center">

                    <div>
                        <p className="text-xs text-slate-500 font-medium">
                            CURRENT STATUS
                        </p>

                        <h2 className="text-lg font-bold mt-1">
                            Emergency Response
                        </h2>
                    </div>

                    <span className="bg-green-50 text-green-700 text-xs px-3 py-1.5 rounded-full font-semibold">
                        READY
                    </span>

                </div>

                <div className="bg-slate-50 rounded-xl p-3 mt-4 flex items-center gap-3">

                    <div className="bg-red-50 text-red-600 p-2.5 rounded-xl">
                        <Ambulance size={23} />
                    </div>

                    <div>
                        <p className="text-sm font-bold">
                            {driverProfile.ambulanceNumber}
                        </p>

                        <p className="text-xs text-slate-500">
                            Ambulance vehicle
                        </p>
                    </div>

                </div>

            </section>

            {/* Journey Details */}

            <section className="grid grid-cols-2 gap-3">

                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <Clock3 size={19} className="text-blue-600" />

                    <p className="text-xs text-slate-500 mt-3">
                        Hospital ETA
                    </p>

                    <h3 className="text-xl font-bold mt-1">
                        -- min
                    </h3>

                    <p className="text-[11px] text-slate-400 mt-1">
                        Not available
                    </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <Hospital size={19} className="text-red-600" />

                    <p className="text-xs text-slate-500 mt-3">
                        Destination
                    </p>

                    <h3 className="text-base font-bold mt-1">
                        Not selected
                    </h3>

                    <p className="text-[11px] text-slate-400 mt-1">
                        Hospital
                    </p>
                </div>

            </section>

            {/* Traffic Coordination */}

            <section className="bg-white border border-slate-200 rounded-2xl p-4">

                <div className="flex items-center gap-3">

                    <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
                        <ShieldCheck size={22} />
                    </div>

                    <div className="flex-1">
                        <h3 className="text-sm font-bold">
                            Traffic Coordination
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                            Police clearance updates
                        </p>
                    </div>

                    <span className="text-xs text-slate-400">
                        Waiting
                    </span>

                </div>

            </section>

            {/* Voice Instructions */}

            <section className="bg-slate-900 text-white rounded-2xl p-4">

                <div className="flex items-center gap-3">

                    <div className="bg-white/10 p-2.5 rounded-xl">
                        <Mic size={22} />
                    </div>

                    <div>
                        <h3 className="font-bold text-sm">
                            Hands-free reporting
                        </h3>

                        <p className="text-xs text-slate-300 mt-1">
                            Use the microphone to report patient condition.
                        </p>
                    </div>

                </div>

            </section>

        </>
    )

    // ==============================
    // ROUTE PAGE
    // ==============================

    const renderRoute = () => (
        <section className="space-y-4">

            <div>
                <h2 className="text-xl font-bold">
                    My Route
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                    Ambulance navigation and hospital destination
                </p>
            </div>

            <div className="h-72 bg-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3">

                <MapPin size={35} className="text-blue-600" />

                <p className="font-semibold text-slate-700">
                    Live map
                </p>

                <p className="text-xs text-slate-500">
                    Map integration will be added later
                </p>

            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4">

                <div className="flex items-center gap-3">

                    <Hospital className="text-red-600" />

                    <div>
                        <p className="text-sm font-bold">
                            Hospital destination
                        </p>

                        <p className="text-xs text-slate-500">
                            Not selected
                        </p>
                    </div>

                </div>

            </div>

        </section>
    )

    // ==============================
    // PROFILE PAGE
    // ==============================

    const renderProfile = () => (
        <section className="space-y-4 pb-5">

            {/* Profile Heading */}

            <div className="flex items-center justify-between">

                <div>
                    <h2 className="text-xl font-bold">
                        My Profile
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                        Manage your driver information
                    </p>
                </div>

                {!editProfile ? (
                    <button
                        onClick={openEditProfile}
                        className="flex items-center gap-1.5 bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold"
                    >
                        <Pencil size={14} />
                        Edit
                    </button>
                ) : (
                    <button
                        onClick={cancelEditProfile}
                        className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold"
                    >
                        Cancel
                    </button>
                )}

            </div>

            {/* Driver Photo */}

            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center">

                <div className="relative w-28 h-28 mx-auto">

                    {draftProfile.photo || driverProfile.photo ? (
                        <img
                            src={
                                editProfile
                                    ? draftProfile.photo
                                    : driverProfile.photo
                            }
                            alt="Driver profile"
                            className="w-full h-full object-cover rounded-full border-4 border-slate-100"
                        />
                    ) : (
                        <div className="w-full h-full bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                            <UserRound size={48} />
                        </div>
                    )}

                    {editProfile && (
                        <button
                            onClick={startCamera}
                            className="absolute bottom-0 right-0 bg-red-600 text-white p-2.5 rounded-full border-4 border-white shadow-md"
                            aria-label="Capture photo"
                        >
                            <Camera size={17} />
                        </button>
                    )}

                </div>

                <h3 className="font-bold mt-3 text-lg">
                    {editProfile ? draftProfile.name : driverProfile.name}
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                    SERTOS Ambulance Driver
                </p>

                {editProfile && (
                    <div className="flex items-center justify-center gap-4 mt-4">

                        <button
                            onClick={startCamera}
                            className="text-xs font-bold text-blue-600 flex items-center gap-1.5"
                        >
                            <Camera size={15} />
                            Capture Photo
                        </button>

                        {draftProfile.photo && (
                            <button
                                onClick={removePhoto}
                                className="text-xs font-bold text-red-600 flex items-center gap-1.5"
                            >
                                <Trash2 size={15} />
                                Remove
                            </button>
                        )}

                    </div>
                )}

            </div>

            {/* Personal Information */}

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">

                <h3 className="font-bold text-sm flex items-center gap-2">
                    <UserRound size={18} className="text-blue-600" />
                    Personal Information
                </h3>

                {/* Full Name */}

                <div>
                    <label className="text-xs text-slate-500 font-semibold">
                        Full Name
                    </label>

                    <input
                        value={editProfile ? draftProfile.name : driverProfile.name}
                        disabled={!editProfile}
                        onChange={e => updateProfileField('name', e.target.value)}
                        className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 text-sm disabled:bg-slate-50 disabled:text-slate-600 outline-none focus:border-blue-500"
                        placeholder="Enter driver name"
                    />
                </div>

                {/* Phone Number */}

                <div>
                    <label className="text-xs text-slate-500 font-semibold">
                        Phone Number
                    </label>

                    <div className="relative">

                        <Phone
                            size={17}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            value={editProfile ? draftProfile.phone : driverProfile.phone}
                            disabled={!editProfile}
                            onChange={e =>
                                updateProfileField(
                                    'phone',
                                    e.target.value.replace(/\D/g, '').slice(0, 10)
                                )
                            }
                            className="w-full mt-1.5 pl-10 pr-3 py-3 rounded-xl border border-slate-200 text-sm disabled:bg-slate-50 disabled:text-slate-600 outline-none focus:border-blue-500"
                            placeholder="Enter 10-digit phone number"
                        />

                    </div>
                </div>

                {/* Age */}

                <div>
                    <label className="text-xs text-slate-500 font-semibold">
                        Age
                    </label>

                    <input
                        type="number"
                        min="18"
                        max="100"
                        value={editProfile ? draftProfile.age : driverProfile.age}
                        disabled={!editProfile}
                        onChange={e => updateProfileField('age', e.target.value)}
                        className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 text-sm disabled:bg-slate-50 disabled:text-slate-600 outline-none focus:border-blue-500"
                        placeholder="Enter age"
                    />
                </div>

            </div>

            {/* Ambulance Information */}

            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">

                <h3 className="font-bold text-sm flex items-center gap-2">
                    <Ambulance size={19} className="text-red-600" />
                    Ambulance Information
                </h3>

                <div>
                    <label className="text-xs text-slate-500 font-semibold">
                        Ambulance Registration Number
                    </label>

                    <input
                        value={
                            editProfile
                                ? draftProfile.ambulanceNumber
                                : driverProfile.ambulanceNumber
                        }
                        disabled={!editProfile}
                        onChange={e =>
                            updateProfileField(
                                'ambulanceNumber',
                                e.target.value.toUpperCase()
                            )
                        }
                        className="w-full mt-1.5 p-3 rounded-xl border border-slate-200 text-sm font-bold disabled:bg-slate-50 disabled:text-slate-600 outline-none focus:border-blue-500"
                        placeholder="e.g. AP 39 AB 1234"
                    />
                </div>

            </div>

            {/* Save Profile */}

            {editProfile && (
                <button
                    onClick={saveDriverProfile}
                    className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
                >
                    <Save size={19} />
                    Save Profile
                </button>
            )}

        </section>
    )

    // ==============================
    // MAIN RENDER
    // ==============================

    return (

        <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">

            {/* HEADER */}

            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">

                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">

                    <div className="flex items-center gap-2.5">

                        <div className="bg-red-600 text-white p-2 rounded-xl">
                            <Ambulance size={22} />
                        </div>

                        <div>
                            <h1 className="text-lg font-extrabold tracking-tight">
                                SERTOS
                            </h1>

                            <p className="text-[10px] text-slate-500">
                                DRIVER APPLICATION
                            </p>
                        </div>

                    </div>

                    <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-full">

                        <Wifi size={14} className="text-green-600" />

                        <span className="text-[11px] font-bold text-green-700">
                            ONLINE
                        </span>

                    </div>

                </div>

            </header>

            {/* MAIN CONTENT */}

            <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">

                {activeTab === 'home' && (
                    <>
                        <div className="flex items-center justify-between">

                            <div>
                                <p className="text-xs text-slate-500">
                                    Welcome back,
                                </p>

                                <h2 className="text-xl font-bold">
                                    {driverProfile.name}
                                </h2>
                            </div>

                            <button className="p-2.5 bg-white border border-slate-200 rounded-xl">
                                <Bell size={19} className="text-slate-600" />
                            </button>

                        </div>

                        {renderHome()}
                    </>
                )}

                {activeTab === 'route' && renderRoute()}

                {activeTab === 'profile' && renderProfile()}

                {/* STATUS MESSAGE */}

                {voiceMessage && (
                    <div className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between gap-3 shadow-xl z-50">

                        <p className="text-xs">
                            {voiceMessage}
                        </p>

                        <button onClick={() => setVoiceMessage('')}>
                            <X size={17} />
                        </button>

                    </div>
                )}

            </main>

            {/* LIVE CAMERA MODAL */}

            {cameraOpen && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col">

                    {/* Camera Header */}

                    <div className="flex items-center justify-between p-4 text-white">

                        <div>
                            <h2 className="font-bold">
                                Capture Driver Photo
                            </h2>

                            <p className="text-xs text-slate-300 mt-1">
                                Position your face inside the frame
                            </p>
                        </div>

                        <button
                            onClick={stopCamera}
                            className="p-2 bg-white/10 rounded-full"
                            aria-label="Close camera"
                        >
                            <X size={22} />
                        </button>

                    </div>

                    {/* Camera Preview */}

                    <div className="flex-1 flex items-center justify-center p-4">

                        {cameraError ? (
                            <div className="text-center text-white max-w-xs">

                                <Camera size={40} className="mx-auto mb-4 text-red-400" />

                                <p className="text-sm leading-6">
                                    {cameraError}
                                </p>

                                <button
                                    onClick={startCamera}
                                    className="mt-5 bg-red-600 px-5 py-3 rounded-xl text-sm font-bold"
                                >
                                    Try Again
                                </button>

                            </div>
                        ) : (
                            <div className="w-full max-w-sm aspect-square overflow-hidden rounded-3xl border-2 border-white/40 bg-slate-900">

                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                />

                            </div>
                        )}

                    </div>

                    {/* Capture Button */}

                    {!cameraError && (
                        <div className="p-8 flex justify-center">

                            <button
                                onClick={capturePhoto}
                                className="w-20 h-20 rounded-full bg-white border-[7px] border-slate-400 flex items-center justify-center active:scale-90 transition-transform"
                                aria-label="Take photo"
                            >
                                <Camera size={30} className="text-slate-900" />
                            </button>

                        </div>
                    )}

                </div>
            )}

            {/* BOTTOM NAVIGATION */}

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">

                <div className="max-w-lg mx-auto px-3 h-[76px] flex items-center justify-around">

                    {/* HOME */}

                    <button
                        onClick={() => setActiveTab('home')}
                        className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'home'
                            ? 'text-red-600'
                            : 'text-slate-400'
                            }`}
                    >
                        <House size={21} />

                        <span className="text-[10px] font-semibold">
                            Home
                        </span>
                    </button>

                    {/* ROUTE */}

                    <button
                        onClick={() => setActiveTab('route')}
                        className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'route'
                            ? 'text-red-600'
                            : 'text-slate-400'
                            }`}
                    >
                        <Route size={21} />

                        <span className="text-[10px] font-semibold">
                            Route
                        </span>
                    </button>

                    {/* MICROPHONE */}

                    <button
                        onClick={startVoiceReport}
                        aria-label={
                            listening
                                ? 'Stop voice recording'
                                : 'Record patient report'
                        }
                        className={`-mt-8 w-[58px] h-[58px] rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white transition-all ${listening
                            ? 'bg-slate-900 animate-pulse'
                            : 'bg-red-600 hover:bg-red-700'
                            }`}
                    >
                        {listening
                            ? <Activity size={25} />
                            : <Mic size={25} />
                        }
                    </button>

                    {/* PROFILE */}

                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'profile'
                            ? 'text-red-600'
                            : 'text-slate-400'
                            }`}
                    >
                        <UserRound size={21} />

                        <span className="text-[10px] font-semibold">
                            Profile
                        </span>
                    </button>

                    <div className="w-2" />

                </div>

            </nav>

        </div>
    )
}

export default DriverPage
