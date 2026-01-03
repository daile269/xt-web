# 🎴 Xì Tố - Game Logic Documentation

## 📋 Tổng Quan

Xì Tố là game bài 7 lá với 5 vòng chia bài và cược. Mỗi người chơi nhận 7 lá bài (2 lá úp tẩy + 5 lá ngửa).

## 🎯 Quy Tắc Chia Bài

### Vòng 1: 3 Lá (Tất cả úp)

- **Số lá**: 3 lá
- **Hiển thị**: 0 lá ngửa (tất cả úp tẩy)
- **Cược**: Ante (tiền cược bắt buộc)
- **Người đi tiền đầu**: Người sau dealer

### Vòng 2: Lá Thứ 4

- **Số lá**: 4 lá
- **Hiển thị**: 2 lá ngửa, 2 lá úp
- **Cược**: Theo cài đặt bàn
  - Bàn 1-3-5-5: Đi 3k
  - Bàn 1-2-3-3: Đi 2k
- **Min/Max**: Tối thiểu 1k, tối đa 3k (hoặc theo config)
- **Người đi tiền đầu**: Người có bài ngửa lớn nhất

#### Đánh Giá Bài Lớn Nhất (Lá 4):

1. **Đôi AA** - Lớn nhất
2. **Đôi KK, QQ, ..., 22** - Theo thứ tự giảm dần
3. **Lá lẻ** - Nếu không có đôi
   - A Bích > A Tép > A Rô > A Cơ
   - K Bích > K Tép > K Rô > K Cơ
   - ...
   - 2 Bích > 2 Tép > 2 Rô > 2 Cơ

**Thứ tự chất**: Bích > Tép > Rô > Cơ (Spades > Clubs > Diamonds > Hearts)

### Vòng 3: Lá Thứ 5

- **Số lá**: 5 lá
- **Hiển thị**: 3 lá ngửa, 2 lá úp
- **Cược**: Tối đa 3k (hoặc theo config)
- **Người đi tiền đầu**: Người có bài ngửa lớn nhất

#### Đánh Giá Bài Lớn Nhất (Lá 5):

1. **Sám Cô (AAA)** - Lớn nhất
2. **Sám Cô (KKK, QQQ, ..., 222)** - Theo thứ tự
3. **Đôi** - Nếu không có sám cô
4. **Lá lẻ** - Nếu không có gì

### Vòng 4: Lá Thứ 6

- **Số lá**: 6 lá
- **Hiển thị**: 4 lá ngửa, 2 lá úp
- **Cược**: 1k - 5k hoặc 1k - 3k (tuỳ cài đặt)
- **Người đi tiền đầu**: Người có bài ngửa lớn nhất

#### Đánh Giá Bài Lớn Nhất (Lá 6):

1. **Sám Cô (AAA, KKK, ...)** - Lớn nhất
2. **Thú (2 đôi)**
   - AA KK > AA QQ
   - 10-10 5-5 > 9-9 8-8 (đôi cao hơn thắng)
   - Nếu 2 người có 2 đôi giống nhau → So chất bích tép rô cơ
     - Ví dụ: QQ 33 (Q Bích) > QQ 33 (Q Tép)
3. **Đôi**
4. **Lá lẻ**

### Vòng 5: Lá Thứ 7 (Showdown)

- **Số lá**: 7 lá
- **Hiển thị**: 5 lá ngửa, 2 lá úp
- **Cược**: Tương tự lá 6
- **Kết thúc**: Lật hết bài, so bài để xác định người thắng

## 🏆 Xếp Hạng Bài (Hand Rankings)

### 1. Sảnh Rồng (Royal Flush)

- 5 lá liên tiếp cùng chất, từ 10 đến A
- Ví dụ: A♠ K♠ Q♠ J♠ 10♠

### 2. Tứ Quý (Four of a Kind)

- 4 lá cùng rank
- Ví dụ: A♠ A♥ A♦ A♣ K♠ Q♥ J♦

### 3. Cù Lũ (Full House)

- 3 lá cùng rank + 2 lá cùng rank
- Ví dụ: K♠ K♥ K♦ 5♠ 5♥

### 4. Thùng (Flush)

- 5 lá cùng chất (không liên tiếp)
- Ví dụ: A♠ K♠ 10♠ 7♠ 3♠

### 5. Sảnh (Straight)

- 5 lá liên tiếp (không cùng chất)
- Ví dụ: 9♠ 8♥ 7♦ 6♣ 5♠

### 6. Sám Cô (Three of a Kind)

- 3 lá cùng rank
- Ví dụ: Q♠ Q♥ Q♦ 9♠ 7♥

### 7. Thú (Two Pair)

- 2 đôi
- Ví dụ: J♠ J♥ 8♦ 8♣ A♠

### 8. Đôi (One Pair)

- 1 đôi
- Ví dụ: 10♠ 10♥ K♦ 7♣ 3♠

### 9. Mậu Thầu (High Card)

- Không có gì, so lá cao nhất
- Ví dụ: A♠ K♥ 9♦ 6♣ 2♠

### 10. Liêng (Special - 3 cards)

- 3 lá liên tiếp cùng chất (chỉ áp dụng khi có 3 lá)
- Ví dụ: 7♠ 6♠ 5♠

## 💰 Cấu Trúc Cược

### Các Loại Bàn:

1. **1-2-3-3**: Ante 1k, Lá 4: 2k, Lá 5-6-7: 3k
2. **1-3-5-5**: Ante 1k, Lá 4: 3k, Lá 5-6-7: 5k

### Giới Hạn Cược:

- **Tối thiểu**: 1,000 chips
- **Tối đa**: 3x số tiền của vòng đó
- **Không có All-in** (theo yêu cầu)

## 🎲 Luồng Game

```
1. Chia 3 lá (tất cả úp) → Cược vòng 1
2. Chia lá thứ 4 (2 úp, 2 ngửa) → Người có bài ngửa lớn nhất đi tiền → Cược vòng 2
3. Chia lá thứ 5 (2 úp, 3 ngửa) → Người có bài ngửa lớn nhất đi tiền → Cược vòng 3
4. Chia lá thứ 6 (2 úp, 4 ngửa) → Người có bài ngửa lớn nhất đi tiền → Cược vòng 4
5. Chia lá thứ 7 (2 úp, 5 ngửa) → Người có bài ngửa lớn nhất đi tiền → Cược vòng 5
6. Showdown → Lật hết bài → Xác định người thắng
```

## 🔧 Implementation Details

### Backend Files:

- **`XiToGame.js`**: Main game logic

  - Chia bài với số lá úp/ngửa đúng
  - Xác định người đi tiền đầu dựa vào bài ngửa
  - Quản lý betting rounds và limits
  - Không có All-in

- **`xiToHandEvaluator.js`**: Hand evaluation
  - `evaluateVisibleCards()`: Đánh giá bài ngửa để xác định người đi tiền
  - `evaluateHand()`: Đánh giá toàn bộ 7 lá ở showdown
  - `compareVisibleHands()`: So sánh bài ngửa (có tiebreaker theo chất)
  - `compareHands()`: So sánh bài đầy đủ

### Tiebreaker Rules:

Khi 2 người có bài giống nhau:

1. So rank (A > K > Q > ... > 2)
2. So chất (Bích > Tép > Rô > Cơ)

### Card Format:

- Rank: `2, 3, 4, 5, 6, 7, 8, 9, T, J, Q, K, A`
- Suit: `H (Cơ), D (Rô), C (Tép), S (Bích)`
- Example: `AS` = A Bích, `2H` = 2 Cơ

## 🎮 Frontend Integration

### Socket Events:

- `game-state-update`: Cập nhật trạng thái game
- `new-round`: Vòng mới bắt đầu
- `player-action`: Người chơi thực hiện hành động
- `showdown`: Lật bài cuối cùng
- `player-timeout`: Người chơi hết thời gian

### Player Actions:

- `fold`: Bỏ bài
- `check`: Xem bài (khi không ai raise)
- `call`: Theo
- `bet/raise`: Cược/Tăng cược (trong giới hạn)

## 📊 Statistics Tracked:

- Số ván thắng/thua
- Tổng tiền thắng/thua
- Thắng lớn nhất/Thua lớn nhất
- Hand rank khi thắng

## 💡 Notes:

- House rake: 5% (2% vào jackpot)
- Turn timer: 30 giây
- Minimum players: 2
- Maximum players: 7
