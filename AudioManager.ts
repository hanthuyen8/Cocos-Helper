/**
 * @version 2.0.0
 * @author https://github.com/hanthuyen8/
 */

const { ccclass, property, executionOrder } = cc._decorator;

@ccclass("AudioData")
class AudioData
{
    public get IsPlaying(): boolean { return this._playId > 0; }
    public get PlayId(): number { return this._playId; }
    public set PlayId(value: number)
    {
        if (value < 0)
            this.timeStamp = 0;
        else
            this.timeStamp = new Date().getTime() / 1000;

        this._playId = value;
    }
    public get RemainingTime(): number { return (new Date().getTime() / 1000) - this.timeStamp; }

    public duration: number = 0;

    @property()
    public audioName: string = "";

    @property()
    public longAudio: boolean = false;

    @property({ type: cc.AudioClip })
    public audioClip: cc.AudioClip = null;

    private _playId: number = -1;
    private timeStamp: number = 0;

    public reset()
    {
        this.PlayId = -1;
    }
}

/**
 * Class này chịu trách nhiệm đơn giản hóa việc play audio xuyên suốt game.
 * Đồng thời chịu trách nhiệm control sao cho các audio không bị chơi đè lên lẫn nhau.
 */
@ccclass
@executionOrder(-1)
export default class AudioManager extends cc.Component
{
    //#region STATICS
    private static audioSource: cc.AudioSource = null;
    private static audioMap: Map<string, AudioData> = null;
    private static lastLongAudio: AudioData = null;

    // Background music
    private static musicOn: boolean = true;
    private static bgMusic: cc.AudioClip = null;
    private static bgVolume: number = 0.2;

    /**Tìm và play audio với: prefix + audio
     * @param prefix_audioId Phải thêm prefix vào audioId. Lưu ý: giữa prefix và audioId phải có dấu cách
     * @param volume Giá trị từ 0 - 1
     * @param callback Hàm sẽ gọi đến khi Audio đã chơi xong.
     */
    public static play(prefix_audioId: string, volume = 1, callback: Function = null): number
    {
        const data = AudioManager.audioMap.get(prefix_audioId);
        if (data)
        {
            let callbackFunction = () =>
            {
                data.reset();
                if (callback)
                    callback();
            };

            volume = cc.misc.clamp01(volume);

            if (data.longAudio)
            {
                this.clearLongAudioCallback();
                const audioSource = AudioManager.audioSource;
                audioSource.stop();

                audioSource.clip = data.audioClip;
                audioSource.volume = volume;
                audioSource.play();

                if (data.duration === 0)
                    data.duration = audioSource.getDuration();

                data.PlayId = setTimeout(callbackFunction, data.duration * 1000);

                this.lastLongAudio = data;
            }
            else
            {
                const audioEngine = cc.audioEngine;
                if (data.IsPlaying)
                    audioEngine.stopEffect(data.PlayId);

                data.PlayId = audioEngine.playEffect(data.audioClip, false);

                if (data.duration === 0)
                    data.duration = audioEngine.getDuration(data.PlayId);

                audioEngine.setEffectsVolume(volume);
                audioEngine.setFinishCallback(data.PlayId, callbackFunction);
            }

            return data.duration;
        }
        else
        {
            cc.error("Không có audio nào có id: " + prefix_audioId);
            if (callback)
                callback();

            return 0;
        }
    }

    /**Dừng audio đang chơi
     * @param prefix_audioId Phải kèm theo cả prefix nữa.
     */
    public static stop(prefix_audioId: string)
    {
        const audio = AudioManager.audioMap.get(prefix_audioId);
        if (audio)
        {
            if (audio.longAudio)
                AudioManager.audioSource.stop();
            else if (audio.IsPlaying)
                cc.audioEngine.stopEffect(audio.PlayId);
            audio.reset();
        }
    }

    public static stopAllEffects()
    {
        AudioManager.clearLongAudioCallback();
        AudioManager.audioSource.stop();
        //cc.audioEngine.stopAllEffects();
    }

    public static checkAudioIdExist(prefix_audioId: string)
    {
        return AudioManager.audioMap.has(prefix_audioId);
    }

    public static getAllAudioIds(): string[]
    {
        let names: string[] = [];
        let keys = AudioManager.audioMap.keys();
        {
            let key: IteratorResult<string, any>;
            do
            {
                key = keys.next();
                names.push(key.value)
            }
            while (!key.done)
        }
        return names;
    }

    /**
     * Hàm này để lấy ra thời lượng còn lại mà audio này cần để chơi xong.
     * @returns đơn vị: giây.
     */
    public static getTimeRemaining(prefix_audioId: string): number
    {
        const audio = AudioManager.audioMap.get(prefix_audioId);
        if (audio)
        {
            const remaining = audio.duration - audio.RemainingTime;
            return remaining > 0 ? remaining : 0;
        }
        return 0;
    }

    /** Hàm này để lấy ra thời lượng của 1 audio
     * @returns Đơn vị: giây.
     */
    public static getDuration(prefix_audioId: cc.AudioClip | string): number
    {
        let audioClip: cc.AudioClip;
        let audioData: AudioData;
        if (prefix_audioId instanceof cc.AudioClip)
        {
            audioClip = prefix_audioId;
        }
        else
        {
            audioData = AudioManager.audioMap.get(prefix_audioId);
            if (!audioData)
                return 0;

            if (audioData.duration > 0)
                return audioData.duration;

            audioClip = audioData.audioClip;
        }

        const id = cc.audioEngine.playEffect(audioClip, false);
        cc.audioEngine.setVolume(id, 0);
        const duration = cc.audioEngine.getDuration(id);

        if (audioData)
            audioData.duration = duration;

        cc.audioEngine.stop(id);
        return duration;
    }

    public static resumeBackgroundMusic()
    {
        if (AudioManager.bgMusic)
        {
            cc.audioEngine.resumeMusic();
        }
    }

    public static pauseBackgroundMusic()
    {
        if (AudioManager.bgMusic)
        {
            cc.audioEngine.pauseMusic();
        }
    }

    /**Xóa callback khi audio đang chơi đã bị dừng giữa chừng. */
    private static clearLongAudioCallback()
    {
        if (this.lastLongAudio)
        {
            clearTimeout(this.lastLongAudio.PlayId);
            this.lastLongAudio = null;
        }
    }
    //#region 

    @property({
        tooltip: "Mục đích của prefix là để cho trường hợp nếu dùng nhiều Audio Manager khác nhau, " +
            + "thì prefix được add thêm vào audioId để giúp phân biệt các audioId của các AudioManager với nhau."
    })
    private prefix: string = "";

    @property(cc.Toggle)
    private toggleMusic: cc.Toggle = null;

    @property({ type: cc.AudioClip })
    private backgroundMusic: cc.AudioClip = null;

    @property()
    private musicVolume: number = 0.2;

    @property({ type: [AudioData] })
    private data: AudioData[] = []

    onLoad()
    {
        this.setUpStatics();
        this.setUpAudioSource();
        this.setUpDict();
        this.setupBgMusic();
    }

    start()
    {
        if (AudioManager.bgMusic && !cc.audioEngine.isMusicPlaying())
        {
            cc.audioEngine.setMusicVolume(AudioManager.bgVolume);
            cc.audioEngine.playMusic(AudioManager.bgMusic, true);

            if (!AudioManager.musicOn)
                cc.audioEngine.pauseMusic();
        }

        if (this.toggleMusic)
        {
            this.toggleMusic.isChecked = AudioManager.musicOn;
        }
    }

    /**Tìm và play audio
     * @param audioId Chỉ cần nhập vào audioId. Prefix sẽ được chèn vào tự động.
     * @param volume Giá trị từ 0 - 1.
     * @param callback Hàm sẽ gọi đến khi audio chơi xong.
     */
    public play(audioId: string, volume = 1, callback: Function = null): number
    {
        return AudioManager.play(this.prefix + audioId, volume, callback);
    }

    /**Dừng lại audio đang chơi với audioId nhất định
     * @param audioId audioId không kèm prefix.
     */
    public stop(audioId: string)
    {
        AudioManager.stop(this.prefix + audioId);
    }

    /**
     * Hàm này để lấy ra thời lượng còn lại mà audio này cần để chơi xong.
     * @param audioId audioId không kèm prefix.
     * @returns đơn vị: giây.
     */
    public getTimeRemaining(audioId: string): number
    {
        return AudioManager.getTimeRemaining(this.prefix + audioId);
    }

    /** Hàm này để lấy ra thời lượng của 1 audio
     * @param audioId Có thể là một audioClip tùy ý. Hoặc audioId thuần túy (không kèm prefix).
     * @returns Đơn vị: giây.
     */
    public getDuration(audioId: cc.AudioClip | string): number
    {
        return AudioManager.getDuration(audioId);
    }

    private toggleBackgroundMusic(toggle: cc.Toggle)
    {
        if (toggle.isChecked)
        {
            AudioManager.musicOn = true;
            AudioManager.resumeBackgroundMusic();
        }
        else
        {
            AudioManager.musicOn = false;
            AudioManager.pauseBackgroundMusic();
        }
    }

    private static _staticsLoaded = false;
    private setUpStatics()
    {
        if (!AudioManager._staticsLoaded)
        {
            AudioManager._staticsLoaded = true;

            // Detect Input
            cc.Canvas.instance.node.once(cc.Node.EventType.TOUCH_START, () =>
            {
                if (!cc.audioEngine.AudioState.PLAYING)
                    cc.audioEngine.stopAllEffects();
                // Không dừng audioSourceLong vì không cần thiết.
            });

            // Clear All Statics
            cc.director.once(cc.Director.EVENT_BEFORE_SCENE_LAUNCH, () =>
            {
                cc.audioEngine.stopAll();
                AudioManager.clearLongAudioCallback();
                if (cc.audioEngine.isMusicPlaying)
                    cc.audioEngine.stopMusic();

                AudioManager.audioMap.clear();
                AudioManager.audioSource = null;
                AudioManager.bgMusic = null;
                AudioManager._staticsLoaded = false;
            });
        }
    }

    private setUpAudioSource()
    {
        if (AudioManager.audioSource == null || cc.isValid(AudioManager.audioSource))
        {
            AudioManager.audioSource = cc.Canvas.instance.node.addComponent(cc.AudioSource);
        }
    }

    private setUpDict()
    {
        if (AudioManager.audioMap == null)
            AudioManager.audioMap = new Map();

        const audioMap = AudioManager.audioMap;

        this.prefix = this.prefix.trim();

        // Chỉ khi nào prefix có kí tự thật sự thì mới thêm dấu cách vào.
        if (this.prefix.length !== 0)
            this.prefix += " ";

        for (let d of this.data)
        {
            const audioId = this.prefix + d.audioName;
            if (audioMap.has(audioId))
            {
                throw new Error("Không được phép có audio trùng \"prefix + audioId\": " + audioId);
            }

            audioMap.set(audioId, d);
        }
    }

    private setupBgMusic()
    {
        if (this.backgroundMusic && !AudioManager.bgMusic)
        {
            AudioManager.bgMusic = this.backgroundMusic;
            AudioManager.bgVolume = this.musicVolume;
        }
    }
}