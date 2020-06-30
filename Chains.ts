/**
 * @version 2.0.0
 * @author https://github.com/hanthuyen8/
 */

import { NodeHelper } from "./Helper";

/**
 * @member Sequence : Chạy tuần tự, ChainFunction sau sẽ chờ cho ChainFunction trước done() thì mới được gọi.
 * @member Parallel : ChainFunction được gọi sẽ gọi done() ngay lập tức để ChainFunction sau cùng chạy.
 */
export enum ProcessType { Sequence, Parallel }

/**
 * Class này có nhiệm vụ tạo ra các hành động nối tiếp nhau.
 * Tạm xem như một giải pháp đơn giản thoát khỏi Callback hell.
 * @example Cách sử dụng: Xem file HuongDanSuDungChains.ts
 */
export class Chains
{
    //#region STATIC MEMBERS

    /**
     * Dictionary chứa tất cả các Chains nào chưa hoàn thành.
     */
    private static AllActiveChains: Map<string, Chains> = new Map;

    /**
     * Hàm này chạy các Chains cùng một lúc và gọi callback khi tất cả đều đã hoàn thành.
     * @param onLastChainCompleted Callback gọi đến khi tất cả đều đã hoàn thành.
     * @param chains Các Chains bất kỳ
     */
    public static StartMultipleChainsParallel(allCompleted: Function, ...chains: Chains[])
    {
        for (let chain of chains)
        {
            let callback = chain._finalCallback;
            if (callback)
            {
                chain._finalCallback = () =>
                {
                    callback();
                    Chains.onOneChainCompleted(chain, chains, allCompleted);
                };
            }
            else
            {
                chain._finalCallback = () => Chains.onOneChainCompleted(chain, chains, allCompleted);
            }
            chain.start(null);
        }
    }

    /**
     * Hàm này chạy các Chains tuần tự và gọi callback khi tất cả đều đã hoàn thành.
     * @param onLastChainCompleted Callback gọi đến khi tất cả đều đã hoàn thành.
     * @param chains Các Chains bất kỳ
     */
    public static StartMultipleChainsSequence(allCompleted: Function, ...chains: Chains[])
    {
        for (let i = 0; i < chains.length - 1; i++)
        {
            let chain = chains[i];
            let callback = chain._finalCallback;
            if (callback)
            {
                chain._finalCallback = () =>
                {
                    callback();
                    chains[i + 1].start();
                };
            }
            else
            {
                chain._finalCallback = () => chains[i + 1].start();
            }
        }
        let lastChain = chains[chains.length - 1];
        let callback = lastChain._finalCallback;
        if (callback)
        {
            lastChain._finalCallback = () => 
            {
                callback();
                allCompleted();
            }
        }
        else
        {
            lastChain._finalCallback = allCompleted;
        }
        chains[0].start();
    }

    /** 
     * Hàm này sẽ do hàm Chains.StartMultipleChains gọi đến để kiểm tra toàn bộ Chains hoàn thành chưa.
     * Nếu tất cả đều đã được hoàn thành rồi thì sẽ gọi đến finalCallback.
     */
    private static onOneChainCompleted(thisChain: Chains, allRelatedChains: Chains[],
        finalCallback: Function)
    {
        let result = allRelatedChains.findIndex(x => x === thisChain);
        if (result != -1)
        {
            cc.js.array.fastRemoveAt(allRelatedChains, result);
        }
        if (allRelatedChains.length == 0)
            finalCallback();
    }

    /**Dừng lại tất cả các Chains */
    public static StopAll()
    {
        this.AllActiveChains.forEach(x => x.stop(false));
    }

    /**
     * Dừng lại Chain bất kỳ.
     * Nếu Chain đã hoàn thành hoặc Chain với Id đó không tồn tại thì sẽ không làm gì cả.
     * @param id Id của Chains cần stop.
     * @param forceComplete mặc định: false ; Nếu true: buộc render kết quả cuối cùng.
     */
    public static Stop(id: string, forceComplete = false)
    {
        if (Chains.AllActiveChains.has(id))
        {
            const c = Chains.AllActiveChains.get(id);
            c.stop(forceComplete);
        }
    }

    /**Kiểm tra Chains đã hoàn thành chưa, trả về true/ false */
    public static IsThisChainFinished(id: string): boolean
    {
        if (Chains.AllActiveChains.has(id))
        {
            const c = Chains.AllActiveChains.get(id);
            return c._isFinished;
        }
        return true;
    }
    //#endregion

    //#region Properties

    //#region Parallel
    /** Đây là thuộc tính dành riêng cho Chain chỉ chuyên chạy Parallel. */
    private _chainType: ProcessType = ProcessType.Sequence;

    /** Thuộc tính này ghi lại tất cả số lần hàm done() được gọi tới. */
    private _doneCount = 0;

    /** Các Chain chạy bên trong Chain này. */
    private _relatedChains: Chains[] = [];
    //#endregion

    /** Tất cả các ChainFunction phải chạy. */
    private chainFunctions: ChainFunction[] = [];

    /** ChainId phải phân biệt được với Chain khác.*/
    private chainId = "";

    /** Callback sẽ gọi đến khi Chains này đã hoàn thành. */
    private _finalCallback: Function = null;

    /** Index hiện tại mà chainFunctions đã thực hiện. */
    private _cfIndex = 0;

    /** Chain đã hoàn hành chưa? */
    private _isFinished = false;
    //#endregion

    //#region Controller

    /**
     * Hàm khởi tạo một Chain.
     * @param id Nhập vào Id của Chain này, Id này sẽ được dùng để Stop Chain khi cần thiết.
     * @summary Chain bị trùng Id sẽ bị Stop + Force Complete.
     */
    constructor(id: string, onCompleted: Function = null)
    {
        let oldChain = Chains.AllActiveChains.get(id);
        if (oldChain)
        {
            if (CC_DEBUG)
                cc.warn(`Chains: ${id} đã tồn tại và đang hoạt động. Hệ thống sẽ Stop Chain cũ + Force Complete và Start Chain mới.`);
            oldChain.stop(true);
        }

        this.chainId = id;
        this._finalCallback = onCompleted;
        Chains.AllActiveChains.set(id, this);
    }

    /**
     * Bắt đầu thực thi Chain.
     * @param onCompleted Callback sẽ gọi tới khi Chain được chơi xong hoàn toàn. 
     */
    public start(onCompleted: Function = null)
    {
        if (onCompleted)
            this._finalCallback = onCompleted;

        this._cfIndex = 0;
        let next = this.chainFunctions[0];

        if (CC_DEBUG)
            cc.log(`Chain ${this.chainId} bắt đầu`);

        if (next)
        {
            next.action();
            if (next.functionType === ProcessType.Parallel)
                this.done();
        }
        else
        {
            throw new Error(`Chain Function index:${this._cfIndex} null`);
        }
    }

    /** Thử nghiệm */
    public startParallel(onCompleted: Function = null)
    {
        if (onCompleted)
            this._finalCallback = onCompleted;

        this._cfIndex = 0;
        this._chainType = ProcessType.Parallel;

        for (let cf of this.chainFunctions)
        {
            cf.functionType = ProcessType.Parallel;
        }

        let next = this.chainFunctions[0];

        if (next)
        {
            next.action();
            if (next.functionType === ProcessType.Parallel)
                this.done();
        }
        else
        {
            throw new Error(`Chain Function index:${this._cfIndex} null`);
        }
    }

    /**
     * Hàm này sẽ gọi tới ChainFunction kế tiếp.
     * @summary Lưu ý: Mọi ChainFunction đều phải gọi tới done() khi đã hoàn thành xong.
     * Nếu không thì Chain sẽ bị dừng lại giữa chừng.
     */
    public done = () =>
    {
        if (this._isFinished)
            return;

        if (this._cfIndex + 1 < this.chainFunctions.length)
        {
            let next = this.chainFunctions[++this._cfIndex];
            if (next)
            {
                next.action();
                if (next.functionType === ProcessType.Parallel)
                    this.done();
            }
            else
            {
                throw new Error(`Chain Function index:${this._cfIndex} null`);
            }
        }
        else if (!this._isFinished)
        {
            if (this._chainType === ProcessType.Parallel)
            {
                // Nếu là Chain kiểu Parallel thì sẽ không stop ngay
                // Mà phải kiểm tra các ChainFunction đã hoàn thành hết thì mới được phép stop
                // Cách kiểm tra sẽ thông qua biến doneCount
                this._doneCount++;
                if (this._doneCount < this.chainFunctions.length + 1)
                    return;
            }

            this._isFinished = true;

            if (this._finalCallback)
                this._finalCallback();

            this.stop(false);
        }
    }

    /**
     * Dừng lại Chain bất kỳ.
     * Nếu Chain đã hoàn thành hoặc Chain với Id đó không tồn tại thì sẽ không làm gì cả.
     */
    public stop(forceComplete: boolean)
    {
        this._isFinished = true;
        this._finalCallback = null;

        for (let cf of this.chainFunctions)
        {
            if (cf.tween)
                cf.tween.stop();

            if (forceComplete && cf.forceComplete)
                cf.forceComplete();
        }
        this.chainFunctions = [];

        for (let chain of this._relatedChains)
        {
            chain.stop(forceComplete);
        }
        this._relatedChains = [];

        if (Chains.AllActiveChains.has(this.chainId))
            Chains.AllActiveChains.delete(this.chainId);

        if (CC_DEBUG)
            cc.log(`Chain ${this.chainId} kết thúc`);
    }

    //#endregion

    //#region Sequence

    /**
     * Add vào Chain này một ChainFunction tùy ý.
     * @param chainFunction Một ChainFunction tùy ý.
     */
    public addChainFunction(chainFunction: ChainFunction): Chains
    {
        this.chainFunctions.push(chainFunction);
        return this;
    }

    /**
     * Add vào Chain này một Function tùy ý.
     * Nhưng lưu ý: Phải gọi đến done() khi Function đó đã hoàn thành.
     * @param func Một Function tùy ý. Phải gọi done() khi hoàn thành.
     * @param forceComplete Là Function sẽ được gọi khi Stop Chain nếu có set forceComplete=true
     */
    public _addManualTimingFunction(func: Function, forceComplete: Function = null): Chains
    {
        const cf = new ChainFunction(func, ProcessType.Sequence);
        cf.forceComplete = forceComplete;

        this.addChainFunction(cf);

        return this;
    }

    /**
     * Add vào Chain này một Function tùy ý.
     * Lưu ý: Không gọi đến done()
     * @param func Một Function tùy ý. Lưu ý: Không gọi đến done()
     * @param forceComplete Là Function sẽ được gọi khi Stop Chain nếu có set forceComplete=true
     */
    public addCustomFunction(func: Function, forceComplete: Function = null): Chains
    {
        const cf = new ChainFunction(null, ProcessType.Sequence);
        cf.action = () =>
        {
            func();
            this.done();
        }
        cf.forceComplete = forceComplete;

        this.addChainFunction(cf);

        return this;
    }

    /**
     * Add vào Chain này một Tween tùy ý.
     * Nhưng lưu ý: Phải gọi đến done() khi Tween đó đã hoàn thành.
     * @param tween Một Tween tùy ý.
     * @param forceComplete Function này sẽ được gọi nếu Chain bị Stop với forceComplete=true;
     */
    public addTween(tween: cc.Tween<unknown>, forceComplete: Function = null): Chains
    {
        let cf = new ChainFunction(() => tween.start(), ProcessType.Sequence);
        cf.tween = tween;
        cf.forceComplete = forceComplete;
        this.addChainFunction(cf);

        return this;
    }

    /**
     * Add vào Chain này một Tween với hiệu ứng (scale to rồi scale về).
     * @param node Node cần scale.
     * @param scaleRate Scale maximum tới mấy lần?
     * @param repeat Lặp lại bao nhiêu lần?
     * @param cycleTime Tổng thời gian để một animation(scale to + scale về) thực hiện.
     */
    public addBouncing(node: cc.Node, scaleRate: number, repeat: number, cycleTime: number): Chains
    {
        let func = ChainFunction.bouncing(node, scaleRate, repeat, cycleTime, this.done);
        this.addChainFunction(func);
        return this;
    }

    /**
     * Add vào Chain này một Tween với hiệu ứng hiện rõ dần lên (chuyển opacity từ 0 -> 255).
     * Lưu ý: Hàm này sẽ tự active Node.
     * @param node Node cần Fade in.
     * @param fadeTime Thời gian hiện lên.
     */
    public addFadeIn(node: cc.Node, fadeTime: number): Chains
    {
        let func = ChainFunction.fadeIn(node, fadeTime, this.done);
        this.addChainFunction(func);
        return this;
    }

    /**
     * Add vào Chain này một Tween với hiệu ứng hiện mờ dần xuống (chuyển opacity từ x -> 0).
     * Lưu ý: Hàm này sẽ không inactive Node khi kết thúc.
     * @param node Node cần Fade out.
     * @param fadeTime Thời gian ẩn đi.
     * @param inactive Có set node.active = false khi kết thúc không?
     */
    public addFadeOut(node: cc.Node, fadeTime: number, inactive: boolean = false): Chains
    {
        let func = ChainFunction.fadeOut(node, fadeTime, inactive, this.done);
        this.addChainFunction(func);
        return this;
    }

    /**
     * Add vào Chain này một Tween với hiệu ứng nhấp nháy (thay đổi color của Node)
     * @param node Node cần nhấp nháy.
     * @param repeat Số lần nhấp nháy.
     * @param cycleTime Thời gian cho mỗi chu kỳ sáng -> tối.
     * @param endColor Màu khi kết thúc tween.
     */
    public addFlashingColor(node: cc.Node, repeat: number, cycleTime: number,
        toColor: cc.Color = cc.Color.GRAY, endColor: cc.Color = cc.Color.WHITE): Chains
    {
        let func = ChainFunction.flashingColor(node, repeat, cycleTime, toColor, endColor, this.done);
        this.addChainFunction(func);
        return this;
    }

    /**
     * Add vào Chain này một Tween với hiệu ứng nhấp nháy (thay đổi opacity của Node)
     * @param node Node cần nhấp nháy.
     * @param repeat Số lần nhấp nháy.
     * @param cycleTime Thời gian cho mỗi chu kỳ sáng -> tối.
     */
    public addFlashingOpacity(node: cc.Node, repeat: number, cycleTime: number): Chains
    {
        let func = ChainFunction.flashingOpacity(node, repeat, cycleTime, this.done);
        this.addChainFunction(func);
        return this;
    }

    public addFlipX(node: cc.Node, duration: number, halfwayFunc: Function): Chains
    {
        let func = ChainFunction.flipX(node, duration, halfwayFunc, this.done);
        this.addChainFunction(func);
        return this;
    }

    /**
     * Add vào Chain này một Tween với hiệu ứng dịch chuyển vị trí của Node này sang vị trí của Node khác.
     * @param moveThis Node này sẽ bị di chuyển.
     * @param duration Thời gian di chuyển tới.
     * @param toThat Sẽ di chuyển đến vị trí của Node này.
     * @param delta Tọa độ cộng thêm nếu muốn đưa vị trí ra khỏi tâm-pivot.
     */
    public addMoveToNode(moveThis: cc.Node, duration: number, toThat: cc.Node, delta: cc.Vec2 = cc.Vec2.ZERO): Chains
    {
        let func = ChainFunction.moveToNode(moveThis, duration, toThat, delta, this.done);
        this.addChainFunction(func);
        return this;
    }

    /**
     * Add vào Chain này một Tween với hiệu ứng dịch chuyển vị trí của Node này sang vị trí khác.
     * @param moveThis Node này sẽ bị di chuyển.
     * @param duration Thời gian di chuyển tới.
     * @param toPosition Vị trí sẽ di chuyển tới.
     */
    public addMoveToPosition(moveThis: cc.Node, duration: number, toPosition: cc.Vec2): Chains
    {
        let func = ChainFunction.moveToPosition(moveThis, duration, toPosition, this.done);
        this.addChainFunction(func);
        return this;
    }

    /**
     * Add vào Chain một thời gian chờ để gọi đến ChainFunction tiếp theo.
     * @param second Thời gian chờ tính bằng giây.
     */
    public addWait(second: number): Chains
    {
        const cf = new ChainFunction(() => setTimeout(this.done, second * 1000)
            , ProcessType.Sequence);
        this.addChainFunction(cf);
        return this;
    }

    //#endregion

    //#region Parallel
    /**
     * Hàm này sẽ chèn vào Chain chính một Chain thứ 2.
     * Tất cả các phần tử thuộc Chain thứ 2 sẽ chạy song song, khi tất cả đã hoàn thành thì sẽ gọi lại Chain chính để chạy tiếp.
     * @param otherChain Chain thứ 2
     */
    public addParallel(otherChain: Chains): Chains
    {
        otherChain._chainType = ProcessType.Parallel;
        otherChain._finalCallback = this.done;
        for (let func of otherChain.chainFunctions)
        {
            func.functionType = ProcessType.Parallel;
        }
        let callOther = new ChainFunction(() => otherChain.start());
        this.chainFunctions.push(callOther);
        this._relatedChains.push(otherChain);
        return this;
    }

    /**
     * Add vào Chain những Function tùy ý. 
     * @summary Nhưng lưu ý: Những Function này sẽ tự động gọi ngay đến ChainFunction tiếp theo mà không đợi cho nó hoàn thành.
     * @summary Phải chú ý: Những Function này tuyệt đối không được gọi đến done().
     * @param func Những Function này tuyệt đối không được gọi đến done().
     * @param forceComplete Function này sẽ được gọi nếu Chain bị Stop với forceComplete=true.
     */
    public addNotWaitCustomFunction(func: Function, forceComplete: Function = null): Chains
    {
        const cf = new ChainFunction(func, ProcessType.Parallel);
        cf.forceComplete = forceComplete;
        this.addChainFunction(cf);
        return this;
    }

    /**
     * Add vào Chain những ChainFunction tùy ý. 
     * @summary Nhưng lưu ý: Những ChainFunction này sẽ tự động gọi ngay đến ChainFunction tiếp theo mà không đợi cho nó hoàn thành.
     * @summary Phải chú ý: Những ChainFunction này tuyệt đối không được gọi đến done().
     * @param chainFunctions 
     */
    public addNotWaitChainFunction(...chainFunctions: ChainFunction[]): Chains
    {
        for (let cf of chainFunctions)
        {
            cf.functionType = ProcessType.Parallel;
            this.chainFunctions.push(cf);
        }
        return this;
    }

    //#endregion
}

//----------------------------------------------------------------------------------------------|
//----------------------------------------------------------------------------------------------|

/**
 * Class này có nhiệm vụ chứa Data cho class Chain hoạt động.
 * Đồng thời cũng cung cấp sắn vài Tween thông dụng.
 */
export class ChainFunction
{
    /** Chứa Function bất kỳ */
    public action: Function;

    /** Hàm này sẽ cần thiết khi cần bắt buộc cho ChainFunction thể hiện ra kết quả cuối cùng */
    public forceComplete: Function;

    /** Chứa Tween của Function đó (nếu có) */
    public tween: cc.Tween<unknown>;

    /** Xem ChainFunctionType */
    public functionType: ProcessType = ProcessType.Sequence;

    constructor(func: Function, type: ProcessType = ProcessType.Sequence)
    {
        this.action = func;
        this.functionType = type;
    }

    public static moveToNode(moveThis: cc.Node, duration: number,
        toThis: cc.Node, delta: cc.Vec2 = cc.Vec2.ZERO, callback: Function = null): ChainFunction
    {
        let toPos: cc.Vec3 = toThis.position;
        const moveThisParent = moveThis.parent;
        const toThisParent = toThis.parent;

        if (moveThisParent !== toThisParent)
        {
            const w = toThisParent.convertToWorldSpaceAR(toPos);
            toPos = moveThisParent.convertToNodeSpaceAR(w);
        }

        // không bắt buộc phải truyền vào delta
        toPos.x += delta.x;
        toPos.y += delta.y;

        const cf: ChainFunction = new ChainFunction(null);

        // Tween
        cf.tween = cc.tween(moveThis)
            .to(duration, { position: toPos });
        if (callback)
            cf.tween.call(callback);

        cf.action = () => cf.tween.start();
        cf.forceComplete = () => moveThis.setPosition(toPos);
        return cf;
    }

    public static moveToPosition(moveThis: cc.Node, duration: number,
        toPosition: cc.Vec2, callback: Function = null): ChainFunction
    {
        let cf: ChainFunction = new ChainFunction(null);
        let toPos = cc.v3(toPosition.x, toPosition.y, 0);

        // Tween
        cf.tween = cc.tween(moveThis)
            .to(duration, { position: toPos });
        if (callback)
            cf.tween.call(callback);

        cf.action = () => cf.tween.start();
        cf.forceComplete = () => moveThis.setPosition(toPos);
        return cf;
    }

    public static fadeIn(node: cc.Node, fadeTime: number, callback: Function = null): ChainFunction
    {
        node.active = true;
        node.opacity = 0;

        let cf: ChainFunction = new ChainFunction(null);
        cf.tween = cc.tween(node)
            .set({ opacity: 0 })
            .to(fadeTime, { opacity: 255 });
        if (callback)
            cf.tween.call(callback);

        cf.action = () => cf.tween.start();
        cf.forceComplete = () => NodeHelper.Show(node);
        return cf;
    }

    public static fadeOut(node: cc.Node, fadeTime: number, inactive: boolean = false,
        callback: Function = null): ChainFunction
    {
        node.active = true;

        let cf: ChainFunction = new ChainFunction(null);
        cf.tween = cc.tween(node)
            .to(fadeTime, { opacity: 0 }).call(() =>
            {
                if (inactive)
                    node.active = false;

                if (callback)
                    callback();
            });

        cf.action = () => cf.tween.start();
        cf.forceComplete = () =>
        {
            if (inactive)
                node.active = false;

            node.opacity = 0;
        };
        return cf;
    }

    public static bouncing(node: cc.Node, scaleRate: number, repeat: number, cycleTime: number,
        callback: Function = null): ChainFunction
    {
        repeat = Math.max(1, repeat);

        let cf: ChainFunction = new ChainFunction(null);
        cf.tween = cc.tween(node)
            .repeat(repeat, cc.tween()
                .to(cycleTime / 2, { scale: scaleRate })
                .to(cycleTime / 2, { scale: 1 }));
        if (callback)
            cf.tween.call(callback);

        cf.action = () => cf.tween.start();
        cf.forceComplete = () => node.scale = 1;
        return cf;
    }

    public static flashingColor(node: cc.Node, repeat: number, cycleTime: number,
        toColor = cc.Color.GRAY, endColor: cc.Color = cc.Color.WHITE, callback: Function = null): ChainFunction
    {
        //node.active = true;

        let cf: ChainFunction = new ChainFunction(null);
        cf.tween = cc.tween(node)
            .repeat(repeat, cc.tween()
                .to(cycleTime / 2, { color: toColor })
                .to(cycleTime / 2, { color: cc.Color.WHITE }))
            .to(0, { color: endColor });
        if (callback)
            cf.tween.call(callback);

        cf.action = () => cf.tween.start();
        cf.forceComplete = () => node.color = cc.Color.WHITE;
        return cf;
    }

    public static flashingOpacity(node: cc.Node, repeat: number, cycleTime: number, callback: Function = null): ChainFunction
    {
        //node.active = true;

        let cf: ChainFunction = new ChainFunction(null);
        cf.tween = cc.tween(node)
            .repeat(repeat, cc.tween()
                .to(cycleTime / 2, { opacity: 128 })
                .to(cycleTime / 2, { opacity: 255 }))
            .call(() =>
            {
                node.color = cc.Color.WHITE;
                if (callback)
                    callback();
            });

        cf.action = () => cf.tween.start();
        cf.forceComplete = () => node.opacity = 255;
        return cf;
    }

    public static flipX(node: cc.Node, duration: number, halfwayFunc: Function = null, callback: Function = null): ChainFunction
    {
        let cf: ChainFunction = new ChainFunction(null);

        cf.tween = cc.tween(node).to(duration / 2, { scaleX: 0 });
        if (halfwayFunc)
            cf.tween.call(halfwayFunc);
        cf.tween.to(duration / 2, { scaleX: 1 });
        if (callback)
            cf.tween.call(callback);

        cf.action = () => cf.tween.start();
        cf.forceComplete = () =>
        {
            if (halfwayFunc)
                halfwayFunc();

            node.scaleX = 1;
        };
        return cf;
    }
}

