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

### AudioManager

...

## Use With

* https://www.cocos.com/en/

## Authors

* **Nguyễn Hy Nhân** - https://github.com/hanthuyen8

## License

Do what you want.
