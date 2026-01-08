# Tính năng Chọn Bài Để Lật - Xì Tố

## Mô tả
Sau khi chia bài xong (3 lá), người chơi được **xem 3 lá bài của mình** (mặt lên), sau đó chọn 1 lá để **lật ra công khai** cho tất cả mọi người thấy. 2 lá còn lại giữ riêng (chỉ mình thấy).

## Các thay đổi đã thực hiện

### Frontend (GameRoom.js)
1. **State mới:**
   - `isSelectingCard`: Trạng thái đang chọn bài
   - `selectedCardIndex`: Index của bài được chọn

2. **Socket Events:**
   - `card-selection-phase`: Nhận thông báo bắt đầu pha chọn bài
   - `card-flipped`: Nhận update khi có người chọn bài

3. **Handler mới:**
   - `handleSelectCard(cardIndex)`: Xử lý khi người chơi click chọn bài

4. **UI Updates:**
   - Hiển thị 3 lá úp có thể click khi đang chọn bài
   - Hiển thị indicator "Chọn bài để lật" ở status bar và giữa bàn
   - Bài có thể chọn có hiệu ứng pulse và glow
   - Bài đã chọn có viền vàng

### Backend (XiToGame.js)
1. **Fields mới trong Room:**
   - `cardSelectionPhase`: Boolean đánh dấu đang trong pha chọn bài
   - `playersWhoSelected`: Array chứa userId của người đã chọn

2. **Method mới:**
   - `handleCardSelection(userId, cardIndex)`: Xử lý việc chọn bài
   - `startBettingRound()`: Bắt đầu vòng cược sau khi tất cả đã chọn

3. **Flow mới:**
   - `start()` → Chia 3 lá úp → Set `cardSelectionPhase = true` → Emit `card-selection-phase`
   - Người chơi chọn bài → `handleCardSelection()` → Move card to `visibleCards`
   - Khi tất cả đã chọn → `startBettingRound()` → Bắt đầu cược

### Socket Handler (socket/index.js)
- Event mới: `select-card-to-flip` - Nhận cardIndex từ client và gọi `game.handleCardSelection()`

### CSS (GameRoom.css)
- `.playing-card.selectable`: Bài có thể chọn với viền tím
- `.playing-card.selected`: Bài đã chọn với viền vàng
- `.card-selection-message`: Message hướng dẫn chọn bài
- Animations: `cardPulse`, `selectedGlow`, `selectionPulse`, `iconBounce`

## Cách test

1. **Khởi động backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Khởi động frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test flow:**
   - Tạo phòng game Xì Tố
   - Có ít nhất 2 người chơi vào phòng
   - Chủ phòng click "Chia Bài"
   - **Kiểm tra:** Mỗi người chơi thấy message "Chọn 1 lá để lật ra" ở giữa bàn
   - **Kiểm tra:** Status bar hiển thị "🎴 Chọn bài để lật"
   - **Kiểm tra:** 3 lá bài của mình hiển thị **mặt lên** (bạn thấy được bài gì)
   - **Kiểm tra:** Cả 3 lá đều có hiệu ứng sáng tím và có thể click
   - Click vào 1 lá bài bạn muốn lật ra (công khai cho người khác thấy)
   - **Kiểm tra:** Lá bài được chọn giữ nguyên mặt lên
   - **Kiểm tra:** 2 lá còn lại chuyển thành úp (giữ riêng)
   - **Kiểm tra:** Toast hiển thị "Đã chọn bài!"
   - **Kiểm tra:** Người chơi khác chỉ thấy 1 lá mặt lên của bạn + 2 lá úp
   - Đợi người chơi khác chọn xong
   - **Kiểm tra:** Tự động chuyển sang vòng cược, status bar đổi thành "🎮 Đang chơi"

## Debug

Nếu không thấy chức năng hoạt động, kiểm tra console:
- `🎴 Card selection phase started:` - Đã nhận event từ server
- `🎴 Player cards render:` - State hiển thị bài
- `🎴 handleSelectCard called:` - Người chơi click vào bài
- `📡 Server response:` - Response từ server

## Lưu ý
- Chỉ áp dụng cho round 1 (3 lá bài)
- Mỗi người chỉ được chọn 1 lần
- Phải đợi tất cả người chơi chọn xong mới bắt đầu cược
