import { Observable, share, Subject } from "rxjs";

export interface RecognitionState {
  state: State;
  transcript?: Transcript;
  soundLevel?: number;
  errorMessage?: string;
}

export interface Transcript {
  finalText?: string;
  partialText?: string;
  alternatives?: string[];
}

export enum State {
  UNKNOWN = "unknown",
  // Full error-list here - https://wicg.github.io/speech-api/#dom-speechrecognitionerrorcode-service-not-allowed
  NOT_SUPPORTED = "not-supported",
  PERMISSION_NOT_GRANTED = "permission-not-granted",
  LANGUAGE_NOT_SUPPORTED = "language-not-supported",
  SERVICE_NOT_ALLOWED = "service-not-allowed",
  NO_AUDIO_INPUT_DEVICE = "no-audio-capture",
  NO_CONNECTION = "no-connection",
  NO_SPEECH_DETECTED = "no-speech-detected",
  ABORTED = "aborted",

  IDLE = "idle",
  START = "start",
  TRANSCRIBING = "transcribing",
  END = "end",
}

/*
 * This is a strategy for adding the symbol webkitSpeechRecognition to the window object,
 * Since TypeScript cannot find it.
 */
interface IWindow extends Window {
  // tslint:disable-next-line:no-any
  webkitSpeechRecognition: any;
}
// tslint:disable-next-line:no-any
const { webkitSpeechRecognition }: IWindow = window as any as IWindow;
const IdleState: RecognitionState = { state: State.IDLE };

/* This class is a wrapper around Chrome's Speech Recognition API. */
export class RecognitionProvider {
  recognition!: any;
  recognitionState: RecognitionState = IdleState;
  recognitionState$: Subject<RecognitionState> = new Subject();
  detectedSpeech: boolean = false;

  constructor() {}

  #initialize(isContinuous: boolean): State {
    if (!("webkitSpeechRecognition" in window)) {
      return State.NOT_SUPPORTED;
    }

    this.recognition = new webkitSpeechRecognition();
    /*
     * When disabled, recognition would automatically stop after the first continguous audio streams.
     * The final transcript is sent one, after #onAudioEnd.
     */
    this.recognition.continuous = isContinuous; // TODO: Parameterize.
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    this.recognition.lang = "en-US";

    // Wire up life-cycle methods, in the order they are invoked.
    this.recognition.onstart = this.#onStart;
    this.recognition.onaudiostart = this.#onAudioStart;
    this.recognition.onsoundstart = this.#onSoundStart;
    this.recognition.onspeechstart = this.#onSpeechStart;
    this.recognition.onspeechend = this.#onSpeechEnd;
    this.recognition.onsoundend = this.#onSoundEnd;
    this.recognition.onaudioend = this.#onAudioEnd;
    this.recognition.onend = this.#onEnd;

    // Wire up response handlers.
    this.recognition.onresult = this.#onResult;
    this.recognition.onerror = this.#onError;
    return State.IDLE;
  }

  /**
   * Fired when the speech recognition service has begun listening to
   * incoming audio with intent to recognize grammars associated with
   * the current SpeechRecognition.
   */
  #onStart = () => {
    console.log("#onStart");
    this.detectedSpeech = false;
    this.recognitionState = {
      state: State.START,
    };
    this.recognitionState$.next(this.recognitionState);
  };

  /** Fired when the user agent has started to capture audio. */
  #onAudioStart = () => {
    console.log("#onAudioStart");
  };

  /** Fired when any sound — recognizable speech or not — has been detected. */
  #onSoundStart = () => {
    console.log("#onSoundStart");
  };

  /** Fired when sound that is recognized by the speech recognition service as speech has been detected. */
  #onSpeechStart = () => {
    console.log("#onSpeechStart");
  };

  /** Fired when speech recognized by the speech recognition service has stopped being detected. */
  #onSpeechEnd = () => {
    console.log("#onSpeechEnd");
  };

  /** Fired when any sound — recognizable speech or not — has stopped being detected. */
  #onSoundEnd = () => {
    console.log("#onSoundEnd");
  };

  /** Fired when the user agent has finished capturing audio. */
  #onAudioEnd = () => {
    console.log("#onAudioEnd");
    this.recognitionState = {
      state: State.END,
    };
    this.recognitionState$.next(this.recognitionState);

    if (!this.detectedSpeech) {
      this.recognitionState = {
        state: State.NO_SPEECH_DETECTED,
        errorMessage: "No speech detected",
      };
      this.recognitionState$.next(this.recognitionState);
    }
  };

  /**
   * Fired when the speech recognition service has disconnected.
   *
   * This method is guaranteed to be executed, even if #onStart was never called,
   * and even in instances where #onSpeechEnd or #onAudioEnd are not invoked.
   */
  #onEnd = () => {
    console.log("#onEnd");
    this.recognitionState = IdleState;
    this.recognitionState$.next(this.recognitionState);
    this.recognition = null;
  };

  /** Fired when a speech recognition error occurs. */
  #onError = (event: any) => {
    const eventError: string = event.error;
    // Not using errorMessage below as it is not very descriptive.
    switch (eventError) {
      case "no-speech":
        this.recognitionState = {
          state: State.NO_SPEECH_DETECTED,
          errorMessage: State.NO_SPEECH_DETECTED,
        };
        break;
      case "audio-capture":
        this.recognitionState = {
          state: State.NO_AUDIO_INPUT_DEVICE,
          errorMessage: State.NO_AUDIO_INPUT_DEVICE,
        };
        break;
      case "not-allowed":
        this.recognitionState = {
          state: State.PERMISSION_NOT_GRANTED,
          errorMessage: State.PERMISSION_NOT_GRANTED,
        };
        break;
      case "network":
        this.recognitionState = {
          state: State.NO_CONNECTION,
          errorMessage: State.NO_CONNECTION,
        };
        break;
      case "aborted":
        this.recognitionState = {
          state: State.ABORTED,
          errorMessage: State.ABORTED,
        };
        break;
      case "language-not-supported":
        this.recognitionState = {
          state: State.LANGUAGE_NOT_SUPPORTED,
          errorMessage: State.LANGUAGE_NOT_SUPPORTED,
        };
        break;
      case "service-not-allowed":
        this.recognitionState = {
          state: State.SERVICE_NOT_ALLOWED,
          errorMessage: State.SERVICE_NOT_ALLOWED,
        };
        break;
      case "bad-grammar":
      default:
        this.recognitionState = {
          state: State.UNKNOWN,
          errorMessage: State.UNKNOWN,
        };
        console.error("#onError unhandled error", eventError, event.message);
        break;
    }
    this.recognitionState$.next(this.recognitionState);
  };

  /**
   * Fired when the speech recognition service returns a
   * result — a word or phrase has been positively recognized
   * and this has been communicated back to the app.
   */
  #onResult = (event: any) => {
    console.log("#onResult", event);
    this.detectedSpeech = true;
    let interimContent = "";
    let finalContent = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalContent += event.results[i][0].transcript;
        this.recognitionState = {
          state: State.TRANSCRIBING,
          transcript: { finalText: finalContent },
        };
        this.recognitionState$.next(this.recognitionState);
      } else {
        interimContent += event.results[i][0].transcript;
        this.recognitionState = {
          state: State.TRANSCRIBING,
          transcript: { partialText: interimContent },
        };
        this.recognitionState$.next(this.recognitionState);
      }
    }
  };

  start(isContinuous: boolean): void {
    if (this.recognition) {
      console.log("stopping recognition");
      this.recognition.abort();

      /*
       * TODO: Wait for recognition object to become null, i.e. onEnd has fired.
       * If this function is invoked twice back-to-back, it would fail.
       */
    }

    const state = this.#initialize(isContinuous);
    if (state === State.NOT_SUPPORTED) {
      this.recognitionState = {
        state: state,
        errorMessage: state,
      };
      this.recognitionState$.next(this.recognitionState);
      return;
    }

    this.recognition.start();
  }

  stop(): void {
    if (!this.recognition) {
      console.error("Stopping recognition that isn't initialized");
      return;
    }

    // Aborting instead of stopping prevents streaming results after closure.
    this.recognition.abort();
  }

  getRecognitionState(): Observable<RecognitionState> {
    return this.recognitionState$.asObservable().pipe(share());
  }
}
