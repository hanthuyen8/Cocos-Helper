# Project Title

Các Script hỗ trợ cho sử dụng Cocos Creator dễ dàng hơn.
"Script có thể không tối ưu cho các game lớn"

## How To Use

### Chains

Class Chains gồm có các public member *(cơ bản)* sau đây:

#### 1. Static members:

Chains.Stop(id : string, forceComplete : boolean);
Chains.StopAll();
Chains.IsThisChainFinished(id : string);

#### 2. Instance members:

**Các hàm điều khiển:**

done();
start(onComplete: Function);
stop(forceComplete : boolean);

**Các hàm hiệu ứng:**

addChainFunction()
addCustomFunction()
addTween()
addBouncing()
addFadeIn()
addFadeOut()
addFlashingColor()
addFlashingOpacity()
addMoveToNode()
addMoveToPosition()
addWait()
addNotWaitCustomFunction()
addNotWaitChainFunction()

Các hàm này sẽ chèn vào các function nối tiếp nhau (như một queue, function này chạy xong sẽ gọi đến function liền sau của nó). Thời điểm mà mỗi function hoàn thành sẽ tùy thuộc vào thời điểm khi nào hàm done() được gọi đến. Có nghĩa rằng mỗi khi gọi đến hàm done() thì một function tiếp theo sẽ được gọi.

Về mặc định, các hàm hiệu ứng nêu trên sẽ gọi đến hàm done() mỗi khi hiệu ứng tween đã kết thúc hoàn toàn.
Trừ 2 hàm :
1. addNotWaitCustomFunction()
2. addNotWaitChainFunction()

Hai hàm này sẽ gọi đến done() ngay lập tức. Mục đích để sử dụng cho các hiệu ứng diễn ra đồng thời (xem như là 1 dạng chạy song song tương đối).

#### 3. Ví dụ:

```
*// Khởi tạo 1 Chains với Id: Test
// Nếu bị trùng Id thì Chains có Id bị trùng sẽ bị stop.*
const chain = new Chains("Test");

chain
    *// Bắt đầu bằng hiệu ứng Fade in node welcomeText trong 0.5 giây*
    .addFadeIn(this.welcomeText, 0.5)

    *// Tiếp theo đó (sau khi FadeIn đã hoàn thành) thì Play Audio có Id: Welcome*
    .addPlayAudio("Welcome");

    *// Vòng lặp sẽ add nhiều phần tử vào (nối tiếp nhau)*
    for (let item of this.items1)
    {
        *// Sau khi Play Audio đã hoàn thành (thời gian chưa biết trước)*
        chain
            *// thì Fade In một node lên trong vòng 0.5 giây*
            .addFadeIn(item, 0.5)

            *// Tiếp tục Play Audio khác*
            .addPlayAudio(item.audio);
    }

    for (let item of this.items2)
    {
        *// Sau khi toàn bộ các hiệu ứng trên đã hoàn thành
        // addNotWait... là prefix của các function sẽ không chờ chính nó hoàn thành
        // mà gọi ngay đến function liền sau 
        // (tạo ra cảm giác như function sau nó sẽ chạy song song với nó)*
        chain.addNotWaitChainFunction(

            *// Vẫn là hiệu ứng Fade In trong vòng 0.5 giây
            // ChainFunction là class chứa các hàm hiệu ứng của class Chains*
            ChainFunction.fadeIn(item, 0.5)
        );
    }

    *// Hiệu ứng sau đây sẽ chạy ngay lập tức ngay sau hàm addNotWait... 
    // mà không cần chờ 0.5 giây như đã khai báo phía trên*
    chain
        *// Chờ 0.5 giây*
        .addWait(0.5)

        *// Sau khi chờ 0.5 giây sẽ gọi đến 1 function bất kỳ
        // function ở đây là in ra: Hello again*
        .addCustomFunction(() => cc.log("Hello again!"))

        *// Hàm start sẽ bắt đầu chạy các hiệu ứng phía trên.
        // Nói cách khác, cách hiệu ứng đã viết ở trên sẽ không chạy
        // cho tới khi nào chain.start() được gọi.
        // Sau khi tất cả các hiệu ứng đã chạy xong thì sẽ gọi đến 1 function bất kỳ nào đó (callback)
        // function ở đây là in ra : Completed*
        .start(()=> cc.log("Completed"));

**Để dừng giữa chừng 1 Chains**
chain.stop() *hoặc* Chains.Stop("Test")
```

### AudioManager

AudioManager được làm ra để giúp quá trình làm 1 game đơn giản trở nên nhanh và maintain hơn.

#### How To Use
AudioManager là một cc.Component nên trước hết phải add nó vào Scene để sử dụng.
Được phép có nhiều AudioManager trên cùng một Scene.
**Nhưng hiện tại chưa tính đến việc load nhiều Scene cùng một lúc**.

AudioManager quản lý các Audio theo một Id cho trước.
Để sử dụng trong Script chỉ cần gọi AudioManager.play(Id) để phát Audio.

#### 1. Static members:

- play()                    // Chơi một audio
- stop()                    // Buộc dừng một audio
- stopAllEffects()          // Dừng tất cả audio (không dừng background music)
- checkAudioIdExist()       // Kiểm tra Id này có tồn tại
- getAllAudioIds()          // Lấy ra toàn bộ các Audio Id đang có
- getTimeRemaining()        // Lấy ra thời gian còn lại mà audio cần để chơi xong
- getDuration()             // Lấy ra thời lượng của audio
- resumeBackgroundMusic()   // Play background music
- pauseBackgroundMusic()    // Tạm dừng background music

#### 2. Instance members:

- play()
- stop()
- getTimeRemaining()        
- getDuration()             

## Use With

* https://www.cocos.com/en/

## Authors

* **Nguyễn Hy Nhân** - https://github.com/hanthuyen8

## License

Do what you want.
