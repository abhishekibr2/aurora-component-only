"use client"
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import confetti from "canvas-confetti";

// Add these constants at the top level after imports
const BASE_WORDS_PER_MINUTE = 190; // Average speaking rate
const TRANSCRIPT_SPEED_MULTIPLIER = 0.8; // Adjust this to speed up (>1) or slow down (<1) the transcript
const MINIMUM_MESSAGE_DURATION = 1; // Minimum seconds per message
const TYPING_SPEED = 32; // Milliseconds per character (lower = faster typing)
const MESSAGE_TRANSITION_DELAY = 1; // Seconds to delay between messages (lower = faster transitions)
const TRANSCRIPT_START_DELAY = 0; // Seconds to delay before starting transcript

// Update the messages array with timestamps
const messages = [
    { id: 1, header: "Start of Conversation", speaker: "Sophie", text: "Hi, Sophie from Bright Smile Clinic. How can I assist you today?", timestamp: 0, isAgent: true },
    { id: 3, header: "Appointment Inquiry", speaker: "Steve", text: "Hey Sophie. I've had a bad toothache for a couple of days. Can I come in tomorrow around 2 to get it checked?", timestamp: 3, isAgent: false },
    { id: 6, header: "Checking Availability", speaker: "Sophie", text: "Let me check the availability for tomorrow at 2 p.m. One moment. Unfortunately, the 2 p.m. slot tomorrow is already booked. How about I check for other times available tomorrow? Would you like to try 3 p.m. or perhaps a different time?", timestamp: 9, isAgent: true },
    { id: 10, header: "Confirmation", speaker: "Steve", text: "3 p.m. sounds good. Anytime in the afternoon works.", timestamp: 24, isAgent: false },
    { id: 12, header: "Appointment Set", speaker: "Sophie", text: "Great news! The 3 p.m. slot tomorrow is available. Can I get your name to book that appointment?", timestamp: 28, isAgent: true },
    { id: 15, header: "Name Confirmation", speaker: "Steve", text: "Awesome. It's Steve.", timestamp: 34, isAgent: false },
    { id: 17, header: "Appointment Confirmation", speaker: "Sophie", text: "Let me confirm your appointment for tomorrow at 3 p.m. Just a minute. Your appointment is all set for tomorrow at 3 p.m. for a toothache checkup. You'll get a confirmation email shortly.", timestamp: 36, isAgent: true },
    { id: 20, header: "Payment Inquiry", speaker: "Steve", text: "Nice. Thanks. Quick question. What kind of payment methods do y'all take there?", timestamp: 47, isAgent: false },
    { id: 24, header: "Payment Methods", speaker: "Sophie", text: "We accept major credit cards, pay with cash, or use care credit financing.", timestamp: 51, isAgent: true },
    { id: 25, header: "Insurance Inquiry", speaker: "Steve", text: "Do you take Delta Dental Insurance?", timestamp: 56, isAgent: false },
    { id: 26, header: "Insurance Confirmation", speaker: "Sophie", text: "Yes, we accept Delta Dental Insurance along with other major insurance providers. If you want to verify your specific plan, feel free to give us a call.", timestamp: 59, isAgent: true },
    { id: 27, header: "Parking Inquiry", speaker: "Steve", text: "Perfect. And, um, what's the deal with parking?", timestamp: 69, isAgent: false },
    { id: 28, header: "Parking Details", speaker: "Sophie", text: "Parking is pretty convenient. There's a lot just a block away, and street parking is also available.", timestamp: 71, isAgent: true },
    { id: 29, header: "Closing the Conversation", speaker: "Steve", text: "Great. Thanks. That's all I needed. See you later.", timestamp: 77, isAgent: false },
    { id: 30, header: "Response", speaker: "Sophie", text: "You're welcome. Looking forward to seeing you tomorrow.", timestamp: 81, isAgent: true }
].map((msg, index, array) => {
    const wordCount = msg.text.split(/\s+/).length;
    const duration = Math.max(
        (wordCount / BASE_WORDS_PER_MINUTE) * 60,
        MINIMUM_MESSAGE_DURATION
    );

    return {
        ...msg,
        duration,
        timestamp: msg.timestamp + TRANSCRIPT_START_DELAY,
        formattedTimestamp: new Date((msg.timestamp + TRANSCRIPT_START_DELAY) * 1000).toISOString().substr(11, 8)
    };
});

// Add this interface after the messages array
interface SpeakingState {
    isAgent: boolean;
    startTime: number;
    endTime: number;
}

// First, let's update the messageTransition configuration
const messageTransition = {
    duration: MESSAGE_TRANSITION_DELAY,
    ease: [0.32, 0.72, 0, 1],
    type: "spring",
    stiffness: 100,
    damping: 20
};

// Update the PhoneAnimation component
const PhoneAnimation = ({ step }: { step: string }) => {
    const icons = {
        volume: (
            <svg
                className="w-10 h-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
        ),
        unavailable: (
            <svg
                className="w-10 h-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        pickup: (
            <svg
                className="w-10 h-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
        )
    };

    return (
        <motion.div
            className="relative w-24 h-24 mx-auto"
            animate={
                step === 'volume' ? {
                    scale: [1, 1.05, 1],
                    transition: {
                        repeat: Infinity,
                        duration: 1.5
                    }
                } : step === 'unavailable' ? {
                    y: [0, -5, 0],
                    transition: {
                        repeat: Infinity,
                        duration: 1.5
                    }
                } : step === 'pickup' ? {
                    scale: [1, 0.95, 1],
                    transition: {
                        repeat: Infinity,
                        duration: 1.5
                    }
                } : {}
            }
        >
            {/* Icon container */}
            <motion.div
                className="absolute inset-0 bg-green-500/10 border border-green-500/20 rounded-full backdrop-blur-sm flex items-center justify-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="text-green-500">
                    {icons[step as keyof typeof icons]}
                </div>
            </motion.div>

            {/* Ripple effect */}
            {(step === 'volume' || step === 'unavailable') && (
                <>
                    <motion.div
                        className="absolute inset-0 border-2 border-green-500/20 rounded-full"
                        initial={{ scale: 1, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 1 }}
                        transition={{
                            repeat: Infinity,
                            duration: 1.5,
                            ease: "easeOut"
                        }}
                    />
                    <motion.div
                        className="absolute inset-0 border-2 border-green-500/10 rounded-full"
                        initial={{ scale: 1, opacity: 0 }}
                        animate={{ scale: 2, opacity: 1 }}
                        transition={{
                            repeat: Infinity,
                            duration: 1.5,
                            delay: 0.5,
                            ease: "easeOut"
                        }}
                    />
                </>
            )}
        </motion.div>
    );
};

// Update the IntroText component
const IntroText = ({ text, onComplete, step }: {
    text: string;
    onComplete: () => void;
    step: string;
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onAnimationComplete={onComplete}
            className="absolute inset-0 flex flex-col items-center justify-center gap-8 p-8"
        >
            <PhoneAnimation step={step} />
            <motion.div
                className="flex flex-col items-center gap-4 text-center pt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h2 className="text-2xl font-medium bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                    {text}
                </h2>
                <p className="text-white/60 max-w-md text-center text-sm">
                    {step === 'volume' && "Make sure your audio is enabled for the best experience."}
                    {step === 'unavailable' && "Sophie, our AI assistant, will be with you shortly."}
                    {step === 'pickup' && "Connecting you with Sophie for assistance..."}
                </p>
            </motion.div>
        </motion.div>
    );
};

// Update the SpeakerIndicator component
const SpeakerIndicator = ({ currentSpeaker, isComplete }: {
    currentSpeaker: SpeakingState | null;
    isComplete: boolean;
}) => {
    return (
        <AnimatePresence>
            {!isComplete && (
                <motion.div
                    className="h-16 bg-gradient-to-t from-black/20 to-transparent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className=" flex items-center justify-center p-4">
                        <motion.div
                            className={`flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-sm ${currentSpeaker
                                ? 'bg-green-500/10 border border-green-500/20'
                                : 'bg-white/5 border border-white/10'
                                }`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            key={currentSpeaker?.isAgent.toString() || 'complete'}
                        >
                            {currentSpeaker ? (
                                <>
                                    {currentSpeaker.isAgent ? (
                                        <svg
                                            className="w-5 h-5 text-green-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                            />
                                        </svg>
                                    ) : (
                                        <svg
                                            className="w-5 h-5 text-green-500"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                            />
                                        </svg>
                                    )}
                                    <span className="text-sm font-medium text-green-500">
                                        {currentSpeaker.isAgent ? "Sophie (Agent) Speaking..." : "Customer Speaking..."}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <svg
                                        className="w-5 h-5 text-white/20"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    <span className="text-sm font-medium text-white/40">
                                        Conversation Complete
                                    </span>
                                </>
                            )}
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Add these interfaces after the existing ones
interface AppointmentAction {
    type: 'booking' | 'insurance' | 'special_offer' | 'time' | 'parking' | 'email';
    icon: React.ReactNode;
    title: string;
    value: string;
    timestamp: number;
    updates?: {
        value: string;
        timestamp: number;
    }[];
}

// Add this helper function to get the current value based on timestamp
const getCurrentActionValue = (action: AppointmentAction, currentTime: number): string => {
    if (!action.updates) return action.value;

    const currentUpdate = [...action.updates]
        .reverse()
        .find(update => currentTime >= update.timestamp);

    return currentUpdate ? currentUpdate.value : action.value;
};

// Add this new interface for tracking previous values
interface ActionCardState {
    previousValue: string;
    hasUpdated: boolean;
}

// Update the ActionCard component to include animation on value changes
const ActionCard = ({ action, isComplete, currentTime }: {
    action: AppointmentAction;
    isComplete: boolean;
    currentTime: number;
}) => {
    const currentValue = getCurrentActionValue(action, currentTime);
    const [state, setState] = useState<ActionCardState>({
        previousValue: currentValue,
        hasUpdated: false
    });

    // Effect to handle value updates
    useEffect(() => {
        if (currentValue !== state.previousValue) {
            setState({ previousValue: currentValue, hasUpdated: true });
            // Reset the update state after animation
            const timer = setTimeout(() => {
                setState(prev => ({ ...prev, hasUpdated: false }));
            }, 2000); // Duration of highlight effect
            return () => clearTimeout(timer);
        }
    }, [currentValue]);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`relative mb-2 ${isComplete ? 'bg-green-400/10 border-green-500/20' : 'bg-green-400/10 border-green-500/20'} 
                       border backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4
                       transition-all duration-500 ease-in-out`}
        >
            {/* Flash animation overlay */}
            <AnimatePresence>
                {state.hasUpdated && (
                    <motion.div
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute inset-0 bg-green-500/20 rounded-2xl pointer-events-none"
                    />
                )}
            </AnimatePresence>

            <div className={`w-10 h-10 rounded-xl ${isComplete ? 'bg-green-500/20 text-green-500' : 'bg-green-500/20 text-green-500'
                } flex items-center justify-center transition-all duration-500 ease-in-out`}>
                {action.icon}
            </div>
            <div className="flex-1">
                <div className="text-sm">{action.title}</div>
                <motion.div
                    className="font-medium"
                    animate={state.hasUpdated ? {
                        scale: [1, 1.02, 1],
                        transition: { duration: 0.3 }
                    } : {}}
                >
                    {currentValue}
                </motion.div>
            </div>

            {/* Update indicator */}
            <AnimatePresence>
                {state.hasUpdated && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// Update the appointmentActions array with dynamic updates
const appointmentActions: AppointmentAction[] = [
    {
        type: 'booking',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        title: 'Appointment Request',
        value: 'Tomorrow at 2:00 PM - Toothache',
        timestamp: 8,
        updates: [
            {
                value: 'Tomorrow at 2:00 PM - Toothache (Requested)',
                timestamp: 8
            },
            {
                value: 'Tomorrow at 3:00 PM - Toothache (Suggested)',
                timestamp: 20
            },
            {
                value: 'Tomorrow at 3:00 PM - Toothache (Confirmed)',
                timestamp: 40
            }
        ]
    },
    {
        type: 'time',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        title: 'Appointment Confirmed',
        value: 'Tomorrow at 3:00 PM',
        timestamp: 41 // After appointment confirmation message
    },
    {
        type: 'insurance',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        ),
        title: 'Insurance',
        value: 'Delta Dental Accepted',
        timestamp: 60 // After insurance inquiry message
    },
    {
        type: 'email',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        ),
        title: 'Confirmation',
        value: 'Email Confirmation Sent',
        timestamp: 45 // After appointment set message
    },
    {
        type: 'parking',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
        ),
        title: 'Parking Available',
        value: 'Lot & Street Parking',
        timestamp: 70 // After parking details message
    }
];

// Update the MessageAvatar component
const MessageAvatar = ({ isAgent, isComplete }: { isAgent: boolean; isComplete: boolean }) => {
    const colorClasses = isComplete
        ? "bg-green-500/10 border-green-500/20 text-green-500"
        : "bg-green-500/10 border-green-500/20 text-green-500";

    return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClasses} border
                        transition-all duration-500 ease-in-out`}>
            {isAgent ? (
                // Agent/Sophie avatar - AI assistant icon
                <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                </svg>
            ) : (
                // Customer avatar - person icon
                <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                </svg>
            )}
        </div>
    );
};

// Update the DemoControls component
const DemoControls = ({
    isIntro,
    onSkip,
    isPlaying,
    onPlayPause,
    isComplete
}: {
    isIntro: boolean;
    onSkip: () => void;
    isPlaying: boolean;
    onPlayPause: () => void;
    isComplete: boolean;
}) => {
    const buttonColorClasses = isComplete
        ? "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
        : "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`absolute ${isIntro ? 'top-4 right-4' : 'bottom-20 lg:bottom-4 left-4'} flex items-center gap-3 z-50 border-2 border-green-500/40 rounded-full`}
        >
            {isIntro ? (
                <></>
            ) : (
                <div className="flex gap-3">
                    {/* <button
                        onClick={onPlayPause}
                        className={`w-10 h-10 rounded-full ${buttonColorClasses} 
                                 backdrop-blur-sm flex items-center justify-center 
                                 transition-all duration-500 ease-in-out shadow-lg`}
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </button> */}

                    <button
                        onClick={onSkip}
                        className={`px-4 py-2 rounded-full ${buttonColorClasses} 
                                 backdrop-blur-sm text-sm font-medium 
                                 transition-all duration-500 ease-in-out 
                                 flex items-center gap-2`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                        </svg>
                        Skip to End
                    </button>
                </div>
            )}
        </motion.div>
    );
};

// Update the CrossButton component
const CrossButton = ({ onClose, isComplete }: { onClose: () => void; isComplete: boolean }) => {
    return (
        <motion.button
            onClick={onClose}
            className={`absolute top-4 right-2 w-8 h-8 rounded-full 
                      ${isComplete ? 'bg-green-500/10 hover:bg-green-500/20' : 'bg-green-500/10 hover:bg-green-500/20'} 
                      backdrop-blur-sm flex items-center justify-center
                      transition-all duration-300
                      hover:scale-110
                      z-50`}
            whileHover={{ rotate: 90 }}
            whileTap={{ scale: 0.9 }}
        >
            <svg
                className={`w-4 h-4 ${isComplete ? 'text-green-500' : 'text-green-500'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                />
            </svg>
        </motion.button>
    );
};

// Add this new interface after the existing interfaces
interface TypewriterProps {
    text: string;
    speed?: number;
    onComplete?: () => void;
    className?: string;
}

// Update the Typewriter component
const Typewriter = ({ text, speed = TYPING_SPEED, onComplete, className = "" }: TypewriterProps) => {
    const [displayedText, setDisplayedText] = useState("");
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        let currentIndex = 0;
        setDisplayedText("");
        setIsComplete(false);

        const updateText = () => {
            if (currentIndex < text.length) {
                setDisplayedText(text.slice(0, currentIndex + 1));
                currentIndex++;
                timeoutId = setTimeout(updateText, speed);
            } else {
                setIsComplete(true);
                setTimeout(() => onComplete?.(), MESSAGE_TRANSITION_DELAY * 1000);
            }
        };

        timeoutId = setTimeout(updateText, speed);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [text, speed, onComplete]);

    return (
        <p className={className || ""}>
            {displayedText}
            {!isComplete && (
                <span className="animate-pulse ml-0.5 opacity-70">|</span>
            )}
        </p>
    );
};

// Add this custom hook at the top of your file
const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
    }, [matches, query]);

    return matches;
};

// Update the CallComponent to include confetti celebration
export default function CallComponentFullPage() {
    const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const animationRef = useRef<number | null>(null);
    const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
    const [showCheckpoint, setShowCheckpoint] = useState(false);
    const [currentSpeaker, setCurrentSpeaker] = useState<SpeakingState | null>(null);
    const [introStep, setIntroStep] = useState<
        'initial' | 'volume' | 'unavailable' | 'pickup' | 'transcript' | 'complete'
    >('initial');
    const [showTranscript, setShowTranscript] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const dialSoundRef = useRef<HTMLAudioElement>(null);
    const isLargerThanMd = useMediaQuery("(min-width: 768px)");


    // Update the updateProgress function
    const updateProgress = () => {
        if (audioRef.current) {
            const currentAudioTime = audioRef.current.currentTime;
            setCurrentTime(currentAudioTime);

            if (currentAudioTime >= messages[messages.length - 1].timestamp + messages[messages.length - 1].duration && !showCheckpoint) {
                setShowCheckpoint(true);
            }

            // Update visible messages based on timing
            const currentMessages = messages
                .filter(msg => msg.timestamp <= currentAudioTime)
                .map(msg => msg.id);
            setVisibleMessages(currentMessages);

            // Update current speaker with improved transition handling
            const currentMessage = messages.find(msg => {
                const messageEndTime = msg.timestamp + msg.duration;
                return currentAudioTime >= msg.timestamp && currentAudioTime <= messageEndTime;
            });

            const nextMessage = messages.find(msg => {
                return currentAudioTime < msg.timestamp;
            });

            if (currentMessage) {
                setCurrentSpeaker({
                    isAgent: currentMessage.isAgent,
                    startTime: currentMessage.timestamp,
                    endTime: currentMessage.timestamp + currentMessage.duration
                });
                setIsAgentSpeaking(currentMessage.isAgent);
            } else if (nextMessage && currentAudioTime < nextMessage.timestamp) {
                // During transition, maintain the last speaker's state
                const lastMessage = messages.find(msg => msg.timestamp <= currentAudioTime);
                if (lastMessage) {
                    setCurrentSpeaker({
                        isAgent: lastMessage.isAgent,
                        startTime: lastMessage.timestamp,
                        endTime: lastMessage.timestamp + lastMessage.duration
                    });
                    setIsAgentSpeaking(lastMessage.isAgent);
                }
            } else if (currentAudioTime >= messages[messages.length - 1].timestamp + messages[messages.length - 1].duration) {
                // Only set to null if we're actually at the end
                setCurrentSpeaker(null);
                setIsAgentSpeaking(false);
            }

            if (currentAudioTime < audioRef.current.duration) {
                animationRef.current = requestAnimationFrame(updateProgress);
            } else {
                setIsComplete(true);
                setIsPlaying(false);
            }
        }
    };

    useEffect(() => {
        if (audioRef.current) {
            // Add event listeners
            const audio = audioRef.current;

            const handlePlay = () => {
                setIsPlaying(true);
                animationRef.current = requestAnimationFrame(updateProgress);
            };

            const handlePause = () => {
                setIsPlaying(false);
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
            };

            const handleEnded = () => {
                setIsPlaying(false);
                setIsComplete(true);
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
            };

            audio.addEventListener('play', handlePlay);
            audio.addEventListener('pause', handlePause);
            audio.addEventListener('ended', handleEnded);

            // Cleanup
            return () => {
                audio.removeEventListener('play', handlePlay);
                audio.removeEventListener('pause', handlePause);
                audio.removeEventListener('ended', handleEnded);
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
            };
        }
    }, []);

    // Auto scroll to bottom when new messages appear
    useEffect(() => {
        if (scrollContainerRef.current) {
            const scrollContainer = scrollContainerRef.current;
            const scrollToBottom = () => {
                scrollContainer.scrollTo({
                    top: scrollContainer.scrollHeight,
                    behavior: 'smooth'
                });
            };
            scrollToBottom();
        }
    }, [visibleMessages]);

    // Add these new helper functions
    const getCurrentMessageIndex = () => {
        if (!audioRef.current) return 0;
        const currentAudioTime = audioRef.current.currentTime;
        return messages.findIndex(msg =>
            msg.timestamp <= currentAudioTime + 0.5 &&
            (!messages[messages.findIndex(m => m.id === msg.id) + 1] ||
                messages[messages.findIndex(m => m.id === msg.id) + 1].timestamp > currentAudioTime + 0.5)
        );
    };

    const getMessageSections = () => {
        const currentIndex = getCurrentMessageIndex();
        return {
            previousPrevious: currentIndex > 1 ? messages[currentIndex - 2] : null,
            previous: currentIndex > 0 ? messages[currentIndex - 1] : null,
            current: messages[currentIndex],
            upcoming: currentIndex < messages.length - 1 ? messages[currentIndex + 1] : null
        };
    };

    // Update the intro sequence useEffect
    useEffect(() => {
        const sequence = async () => {
            // Start dial sound
            if (dialSoundRef.current) {
                dialSoundRef.current.loop = true;
                dialSoundRef.current.play();
            }

            // Start with volume warning
            await new Promise(resolve => setTimeout(resolve, 500));
            setIntroStep('volume');

            // Show unavailable message
            await new Promise(resolve => setTimeout(resolve, 2000));
            setIntroStep('unavailable');

            // Show pickup message
            await new Promise(resolve => setTimeout(resolve, 2000));
            setIntroStep('pickup');

            // Start transcript and audio
            await new Promise(resolve => setTimeout(resolve, 2000));
            setIntroStep('transcript');

            // Add transition to dark mode before showing transcript
            await new Promise(resolve => setTimeout(resolve, 300));
            setIsDarkMode(true);

            await new Promise(resolve => setTimeout(resolve, 200));
            setShowTranscript(true);

            // Stop dial sound and start transcript audio
            if (dialSoundRef.current) {
                dialSoundRef.current.pause();
                dialSoundRef.current.currentTime = 0;
            }

            // Add a small delay before starting audio
            await new Promise(resolve => setTimeout(resolve, 0));
            if (audioRef.current) {
                audioRef.current.play();
                setIsPlaying(true);
            }
        };

        sequence();

        // Cleanup function
        return () => {
            if (dialSoundRef.current) {
                dialSoundRef.current.pause();
                dialSoundRef.current.currentTime = 0;
            }
        };
    }, []);

    // Add this function to trigger confetti
    const triggerConfetti = () => {
        const duration = 1 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 560, ticks: 60, zIndex: 9999 };

        const randomInRange = (min: number, max: number) => {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 60 * (timeLeft / duration);

            // Trigger confetti from two sources
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });

            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    };

    // Update the handleSkipDemo function to include confetti
    const handleSkipDemo = () => {
        // Stop dial sound if playing
        if (dialSoundRef.current) {
            dialSoundRef.current.pause();
            dialSoundRef.current.currentTime = 0;
        }

        // Update states immediately
        setIntroStep('transcript');
        setIsDarkMode(true);
        setShowTranscript(true);

        // Small delay to ensure state updates are processed
        setTimeout(() => {
            if (audioRef.current) {
                // Show all messages
                const allMessageIds = messages.map(msg => msg.id);
                setVisibleMessages(allMessageIds);

                // Set current time to end of audio
                const duration = audioRef.current.duration;
                audioRef.current.currentTime = duration;
                setCurrentTime(duration);

                // Update completion state
                setIsComplete(true);
                setIsPlaying(false);

                // Trigger confetti
                triggerConfetti();
            }
        }, 100);
    };

    // Update the handlePlayPause function
    const handlePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                // If we're at the end, restart
                if (audioRef.current.currentTime >= audioRef.current.duration) {
                    audioRef.current.currentTime = 0;
                    setVisibleMessages([]);
                    setCurrentTime(0);
                    setIsComplete(false);
                }
                audioRef.current.play();
            }
        }
    };

    const handleReset = () => {
        // Reset all states to initial values
        setVisibleMessages([]);
        setIsComplete(false);
        setIsPlaying(false);
        setCurrentTime(0);
        setIsAgentSpeaking(false);
        setShowCheckpoint(false);
        setCurrentSpeaker(null);
        setIntroStep('initial');
        setShowTranscript(false);
        setIsDarkMode(false);

        // Reset audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        // Start the intro sequence again
        setTimeout(() => {
            setIntroStep('volume');
        }, 500);
    };

    // Add useEffect to trigger confetti when transcript naturally completes
    useEffect(() => {
        if (isComplete && !isPlaying) {
            triggerConfetti();
        }
    }, [isComplete, isPlaying]);

    return (
        <div className="w-full h-screen flex items-center justify-center bg-[#09090b]">
            <motion.div
                initial={{
                    opacity: 0,
                    y: 20,
                    scale: 0.95
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1
                }}
                transition={{
                    duration: 0.8,
                    ease: [0.19, 1.0, 0.22, 1.0],
                    staggerChildren: 0.1
                }}
                className="relative w-full h-full flex items-center justify-center m-4"
            >
                <Card
                    className={`
                        w-full 
                        h-full
                        relative 
                        overflow-hidden
                        shadow-2xl 
                        rounded-none
                        transition-all
                        duration-700 
                        ease-in-out
                        text-white
                        bg-clip-padding
                        backdrop-filter
                        backdrop-blur-xl
                        bg-[#09090b]
                        border-0
                        shadow-none
                        before:absolute
                        before:inset-0
                        before:animate-pulse
                        before:bg-gradient-to-r
                        before:from-transparent
                        ${isComplete ? 'before:via-green-600/10' : 'before:via-green-600/10'}
                        before:to-transparent
                        before:blur-3xl
                        before:-z-10
                        [transition:border-color_0.5s_ease,background-color_0.5s_ease,transform_0.5s_ease]
                    `}
                >
                    {/* Add the CrossButton near the top of the Card */}

                    {/* Background layers */}
                    {/* <div className="absolute inset-0">
                        <WavyBackground
                            // blur={2}
                            speed="fast"
                            waveWidth={30}
                            className="absolute left-0 w-full h-full"
                            waveOpacity={0.4}
                            colors={['#000000', '#333333', '#666666']}
                            backgroundFill="#09090b"
                        />
                        Semi-transparent overlay
                        <div className="absolute inset-0 backdrop-blur-sm" />
                    </div> */}

                    {/* <Particles
                        className="absolute inset-0"
                        quantity={100}
                        ease={80}
                        color={"#ffffff"}
                        refresh
                    /> */}

                    <div className="relative z-[2] w-full h-full">
                        <AnimatePresence mode="wait">
                            {(introStep === 'volume' || introStep === 'unavailable' || introStep === 'pickup') && (
                                <IntroText
                                    key={introStep}
                                    step={introStep}
                                    text={
                                        introStep === 'volume'
                                            ? "Starting demo... Please turn up your volume."
                                            : introStep === 'unavailable'
                                                ? "Front desk is currently unavailable or call is after hours."
                                                : "Sophie is picking up your call..."
                                    }
                                    onComplete={() => { }}
                                />
                            )}

                            {introStep === 'transcript' && showTranscript && (
                                <motion.div
                                    key="transcript"
                                    className="lg:flex h-full rounded-3xl overflow-hidden bg-transparent z-[2] "
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                >
                                    {/* Left side - Call Transcript */}
                                    <motion.div
                                        className="flex-1 p-8 pb-4 relative z-10 flex flex-col h-[40vh] lg:h-full justify-center items-center"
                                        initial={{ x: 0, opacity: 0 }}
                                        animate={{
                                            x: isLargerThanMd ? (
                                                visibleMessages.length > 1 && currentTime >= messages[1].timestamp + 4
                                                    ? "0%"
                                                    : "0%"
                                            ) : 0,
                                            width: isLargerThanMd ? (
                                                visibleMessages.length > 1 && currentTime >= messages[1].timestamp + 4
                                                    ? "100%"
                                                    : "100%"
                                            ) : "100%",
                                            opacity: 1
                                        }}
                                        transition={{
                                            duration: 0.5,
                                            type: "spring",
                                            stiffness: 100,
                                            damping: 20
                                        }}
                                    >
                                        <div className="flex flex-col w-full max-w-3xl lg:max-h-[50vh] h-full scrollbar-thin scrollbar-thumb-green-500/20 scrollbar-track-transparent hover:scrollbar-thumb-green-500/40">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-3 w-3 rounded-full ${isComplete ? 'bg-green-500' : 'bg-green-500'} 
                                                        animate-pulse transition-colors duration-500 ease-in-out`} />
                                                    <h2 className="text-xl font-medium underline underline-offset-4 decoration-green-500">
                                                        Demo: AI Agent Handling a Call
                                                    </h2>
                                                </div>
                                            </div>
                                            <div
                                                ref={scrollContainerRef}
                                                className="flex-1 flex flex-col space-y-6 pr-4 overflow-y-auto max-h-[calc(100vh-200px)]"
                                                style={{
                                                    scrollbarWidth: 'thin',
                                                    scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent'
                                                }}
                                            >
                                                {/* Previous-Previous message section */}
                                                <motion.div
                                                    key={`prev-prev-${getMessageSections().previousPrevious?.id}`}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 0.5, y: 0 }}
                                                    exit={{ opacity: 0, y: -10, transition: { duration: 0.4 } }}
                                                    transition={messageTransition}
                                                    className="space-y-0.5 hidden lg:block md:block"
                                                >
                                                    {getMessageSections().previousPrevious && (
                                                        <div className="flex items-start gap-3 overflow-y-scroll">
                                                            <MessageAvatar
                                                                isAgent={getMessageSections().previousPrevious?.isAgent || false}
                                                                isComplete={isComplete}
                                                            />
                                                            <div className="flex-1">
                                                                <div className="text-lg flex items-center gap-2 opacity-50">
                                                                    <span>
                                                                        {getMessageSections().previousPrevious?.isAgent
                                                                            ? "Sophie (Agent)"
                                                                            : "Customer"}
                                                                    </span>
                                                                </div>
                                                                <div className={`text-sm text-gray-400 opacity-50 ${getMessageSections().previousPrevious?.isAgent ? 'italic' : ''
                                                                    }`}>
                                                                    {getMessageSections().previousPrevious?.text || ""}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>

                                                {/* Previous message section */}
                                                <motion.div
                                                    key={`prev-${getMessageSections().previous?.id}`}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 0.8, y: 0 }}
                                                    exit={{ opacity: 0, y: -10, transition: { duration: 0.4 } }}
                                                    transition={messageTransition}
                                                    className="space-y-0.5"
                                                >
                                                    {getMessageSections().previous && (
                                                        <div className="flex items-start gap-3">
                                                            <MessageAvatar
                                                                isAgent={getMessageSections().previous?.isAgent || false}
                                                                isComplete={isComplete}
                                                            />
                                                            <div className="flex-1">
                                                                <div className="text-lg flex items-center gap-2">
                                                                    <span>
                                                                        {getMessageSections().previous?.isAgent
                                                                            ? "Sophie (Agent)"
                                                                            : "Customer"}
                                                                    </span>
                                                                </div>
                                                                <div className={`text-sm text-gray-400 ${getMessageSections().previous?.isAgent ? 'italic' : ''
                                                                    }`}>
                                                                    {getMessageSections().previous?.text || ""}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>

                                                {/* Current message section */}
                                                {getMessageSections().current && (
                                                    <motion.div
                                                        key={`current-${getMessageSections().current.id}`}
                                                        initial={{ opacity: 0, scale: 0.98 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, y: -15, transition: { duration: 0.3 } }}
                                                        transition={messageTransition}
                                                        className="space-y-1"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <MessageAvatar
                                                                isAgent={getMessageSections().current.isAgent}
                                                                isComplete={isComplete}
                                                            />
                                                            <div className="flex-1">
                                                                <div className="text-lg flex items-center gap-2">
                                                                    <span>
                                                                        {getMessageSections().current.isAgent
                                                                            ? "Sophie (Agent)"
                                                                            : "Customer"}
                                                                    </span>
                                                                </div>
                                                                <div className={`text-lg font-medium ${getMessageSections().current.isAgent ? 'italic' : ''
                                                                    }`}>
                                                                    <Typewriter
                                                                        text={getMessageSections().current.text}
                                                                        speed={TYPING_SPEED}
                                                                        className="whitespace-pre-line leading-relaxed"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Right side - Action Cards */}
                                    <AnimatePresence>
                                        {visibleMessages.length > 1 && currentTime >= messages[1].timestamp + 4 && (
                                            <motion.div
                                                className="h-[65vh] lg:h-full lg:w-[600px] p-8 flex flex-col lg:border-l border-white/10 pb-0 mb-0"
                                                initial={{ x: 600, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                exit={{ x: 600, opacity: 0 }}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 100,
                                                    damping: 20
                                                }}
                                            >
                                                <div className="flex flex-col max-w-3xl w-full h-full">
                                                    {/* Add a wrapper div for centering */}
                                                    <div className="flex-1 flex lg:items-center">
                                                        <div className="w-full max-h-[60%] overflow-y-auto scrollbar-thin scrollbar-thumb-green-500/20 scrollbar-track-transparent hover:scrollbar-thumb-green-500/40">
                                                            <h2 className="text-xl font-medium underline underline-offset-4 decoration-green-500 mb-4">
                                                                Call Highlights
                                                            </h2>
                                                            <div className="flex flex-col gap-2">
                                                                {appointmentActions.map((action) => (
                                                                    currentTime >= action.timestamp && (
                                                                        <ActionCard
                                                                            key={action.type}
                                                                            action={action}
                                                                            isComplete={isComplete}
                                                                            currentTime={currentTime}
                                                                        />
                                                                    )
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Speaker Indicator */}
                                    <div className="absolute bottom-0 right-0 md:left-0 hidden lg:block">
                                        <SpeakerIndicator
                                            currentSpeaker={currentSpeaker}
                                            isComplete={isComplete}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Add the DemoControls component */}
                    <DemoControls
                        isIntro={introStep !== 'transcript'}
                        onSkip={handleSkipDemo}
                        isPlaying={isPlaying}
                        onPlayPause={handlePlayPause}
                        isComplete={isComplete}
                    />
                </Card>
                {/* Audio elements */}
                <audio ref={audioRef} className="hidden" preload="auto">
                    <source src="./audio/Demo_Voice.mp3" type="audio/mpeg" />
                </audio>
                <audio ref={dialSoundRef} className="hidden" preload="auto">
                    <source src="./audio/PhoneDialSound.mp3" type="audio/mpeg" />
                </audio>
            </motion.div>
        </div>
    );
}
