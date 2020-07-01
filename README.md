# Cocos Helper Class

Các Script hỗ trợ cho sử dụng Cocos Creator dễ dàng hơn.

*Script có thể không phù hợp hoặc không đủ tối ưu cho các game từ mid đến large scale*

## Cách sử dụng

### Chains

Chains được tạo ra vì lý do **cc.Tween** của Cocos không hỗ trợ cho việc chain nhiều Tween của các node khác nhau một cách dễ dàng. Và thường thì nó sẽ tạo ra một callback hell với số lượng indent khủng khiếp.

Về bản chất Chains vẫn tạo ra callback hell, nhưng nó được giấu bên dưới các function, function này chạy xong sẽ tự gọi đến function khác. Nhưng ưu điểm là cú pháp dễ nhìn hơn rất nhiều.

Ban đầu, tôi có nghĩ đến việc sử dụng Promise. Nhưng Promise cũng có nhược điểm:
1. Promise gây khó hiểu cho reader
2. Promise hell
3. Không thể cancel

Vậy nên tôi đã nghĩ đến việc làm ra một class như thế này ngay từ khi bắt đầu tìm hiểu về Cocos. Một phần cũng vì thích kiểu tiện dụng của Coroutine ở Unity

#### Class Chains gồm có các public member *(cơ bản)* sau đây:

#### 1. Static members:

```typescript
- Chains.Stop(id : string, forceComplete : boolean);
- Chains.StopAll();
- Chains.IsThisChainFinished(id : string);
```

#### 2. Instance members:

**Các hàm điều khiển:**

```typescript
- done();
- start(onComplete: Function);
- stop(forceComplete : boolean);
```

**Các hàm hiệu ứng:**

```typescript
- addChainFunction()
- addCustomFunction()
- addTween()
- addBouncing()
- addFadeIn()
- addFadeOut()
- addFlashingColor()
- addFlashingOpacity()
- addMoveToNode()
- addMoveToPosition()
- addWait()
- addNotWaitCustomFunction()
- addNotWaitChainFunction()
```

**ChainFunction** là một class chứa các hiệu ứng để class Chains sử dụng.
Các hàm này sẽ chèn vào các ChainFunction nối tiếp nhau (như một queue, ChainFunction này chạy xong sẽ gọi đến ChainFunction tiếp theo).

*Thời điểm mà mỗi ChainFunction hoàn thành sẽ tùy thuộc vào thời điểm khi nào hàm done() được gọi đến. Có nghĩa rằng mỗi khi gọi đến hàm done() thì một ChainFunction tiếp theo sẽ được gọi.*

**Vậy nên, bug sẽ xuất hiện nếu done() được gọi nhiều hơn một lần trong một ChainFunction. Hoặc done() không bao giờ được gọi tới.**

Về mặc định, ChainFunction này sẽ gọi đến ChainFunction tiếp theo mỗi khi các function bên trong của nó đã kết thúc hoàn toàn.
**Trừ 2 hàm :**
```typescript
1. addNotWaitCustomFunction()
2. addNotWaitChainFunction()
```

Hai hàm này sẽ gọi đến ChainFunction liền sau ngay lập tức. Mục đích để tạo ra cảm giác hiệu ứng diễn ra đồng thời (xem như là 1 dạng chạy song song một cách tương đối).

#### 3. Ví dụ (không chú thích - chú thích ở mục 4):
```typescript
const chain = new Chains("Test");

chain
    .addFadeIn(this.welcomeText, 0.5)
    .addPlayAudio("Welcome");

    for (let item of this.items1)
    {
        chain
            .addFadeIn(item, 0.5)
            .addPlayAudio(item.audio);
    }

    for (let item of this.items2)
    {
        chain.addNotWaitChainFunction(
            ChainFunction.fadeIn(item, 0.5),
            ChainFunction.bouncing(item, 1.5, 0, 0.5)
        );
    }

    chain
        .addWait(0.5)
        .addCustomFunction(() => cc.log("Hello again!"))

        .start(()=> cc.log("Completed"));
```

#### 4. Chú thích ví dụ trên:
```typescript
// Khởi tạo 1 Chains với Id: Test
// Nếu bị trùng Id thì Chains có Id bị trùng sẽ bị stop.
const chain = new Chains("Test");

chain
    // Bắt đầu bằng hiệu ứng Fade in node welcomeText trong 0.5 giây
    .addFadeIn(this.welcomeText, 0.5)

    // Tiếp theo đó (sau khi FadeIn đã hoàn thành) thì Play Audio có Id: Welcome
    .addPlayAudio("Welcome");

    // Vòng lặp sẽ add nhiều phần tử vào (nối tiếp nhau)
    for (let item of this.items1)
    {
        // Sau khi Play Audio đã hoàn thành (thời gian chưa biết trước)
        chain
            // thì Fade In một node lên trong vòng 0.5 giây
            .addFadeIn(item, 0.5)

            // Tiếp tục Play Audio khác
            .addPlayAudio(item.audio);
    }

    for (let item of this.items2)
    {
        // Sau khi toàn bộ các hiệu ứng trên đã hoàn thành
        // addNotWait... là prefix của các function sẽ không chờ chính nó hoàn thành
        // mà gọi ngay đến function liền sau 
        // (tạo ra cảm giác như function sau nó sẽ chạy song song với nó)
        chain.addNotWaitChainFunction(

            // Vẫn là hiệu ứng Fade In trong vòng 0.5 giây
            ChainFunction.fadeIn(item, 0.5),

            // Scale node lên x1.5 lần, lặp lại 0 lần, trong vòng 0.5 giây
            ChainFunction.bouncing(item, 1.5, 0, 0.5)
        );
    }

    // Hiệu ứng sau đây sẽ chạy ngay lập tức ngay sau hàm addNotWait... 
    // mà không cần chờ 0.5 giây như đã khai báo phía trên
    chain
        // Chờ 0.5 giây
        .addWait(0.5)

        // Sau khi chờ 0.5 giây sẽ gọi đến 1 function bất kỳ
        // function ở đây là in ra: Hello again
        .addCustomFunction(() => cc.log("Hello again!"))

        // Hàm start sẽ bắt đầu chạy các hiệu ứng phía trên.
        // Nói cách khác, cách hiệu ứng đã viết ở trên sẽ không chạy
        // cho tới khi nào chain.start() được gọi.
        // Sau khi tất cả các hiệu ứng đã chạy xong thì sẽ gọi đến 1 function bất kỳ nào đó (callback)
        // function ở đây là in ra : Completed
        .start(()=> cc.log("Completed"));

//Để dừng giữa chừng 1 Chains
chain.stop() 
//hoặc
Chains.Stop("Test")
```

### AudioManager

AudioManager được làm ra để giúp quá trình làm 1 *game đơn giản* trở nên nhanh chóng và dễ maintain hơn.

#### Cách sử dụng
AudioManager là một cc.Component nên trước hết phải add nó vào Scene để sử dụng.

Được phép có nhiều AudioManager trên cùng một Scene.

**Nhưng hiện tại chưa tính đến việc load nhiều Scene cùng một lúc**.

AudioManager quản lý các Audio theo một Id cho trước.

Để sử dụng trong Script chỉ cần gọi **AudioManager.play(Id)** để phát Audio.

#### 1. Static members:
```typescript
- play()                    // Chơi một audio
- stop()                    // Buộc dừng một audio
- stopAllEffects()          // Dừng tất cả audio (không dừng background music)
- checkAudioIdExist()       // Kiểm tra Id này có tồn tại
- getAllAudioIds()          // Lấy ra toàn bộ các Audio Id đang có
- getTimeRemaining()        // Lấy ra thời gian còn lại mà audio cần để chơi xong
- getDuration()             // Lấy ra thời lượng của audio
- resumeBackgroundMusic()   // Play background music
- pauseBackgroundMusic()    // Tạm dừng background music
```

#### 2. Instance members:
```typescript
- play()
- stop()
- getTimeRemaining()
- getDuration()
```

## Use With

* https://www.cocos.com/en/

## Authors

* **Nguyễn Hy Nhân** - https://github.com/hanthuyen8

## License

Do what you want.
