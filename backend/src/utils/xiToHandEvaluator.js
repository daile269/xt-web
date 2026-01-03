// Xì Tố (Xì Phé) hand evaluator
class XiToHandEvaluator {
  constructor() {
    this.rankValues = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };

    // Suit values for tiebreaker (Bích > Tép > Rô > Cơ)
    this.suitValues = {
      'S': 4, // Spades (Bích)
      'C': 3, // Clubs (Tép)
      'D': 2, // Diamonds (Rô)
      'H': 1  // Hearts (Cơ)
    };

    // Xì Tố hand rankings (highest to lowest)
    this.handRanks = {
      'SANH_RONG': 10,          // Royal Flush/Dragon Straight
      'TU_QUY': 9,              // Four of a Kind
      'CU_LU': 8,               // Full House
      'THUNG': 7,               // Flush
      'SANH': 6,                // Straight
      'SAM_CO': 5,              // Three of a Kind (Sám Cô)
      'THU': 4,                 // Two Pair (Thú)
      'DOI': 3,                 // One Pair (Đôi)
      'MAU_THAU': 2,            // High Card
      'LIENG': 1                // Special: 3 cards same suit consecutive
    };
  }

  parseCard(card) {
    return {
      rank: card[0],
      suit: card[1],
      value: this.rankValues[card[0]],
      suitValue: this.suitValues[card[1]]
    };
  }

  // Evaluate visible cards only (for determining who bets first)
  evaluateVisibleCards(visibleCards) {
    if (!visibleCards || visibleCards.length === 0) {
      return { rank: 0, name: 'No Cards', cards: [], highCard: null };
    }

    const parsedCards = visibleCards.map(c => this.parseCard(c));
    const sortedCards = parsedCards.sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return b.suitValue - a.suitValue; // Tiebreaker by suit
    });

    // Count ranks
    const rankCounts = {};
    parsedCards.forEach(c => {
      if (!rankCounts[c.rank]) {
        rankCounts[c.rank] = [];
      }
      rankCounts[c.rank].push(c);
    });

    const counts = Object.entries(rankCounts)
      .map(([rank, cards]) => ({ rank, count: cards.length, cards }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        // Same count, compare by rank value
        if (b.cards[0].value !== a.cards[0].value) {
          return b.cards[0].value - a.cards[0].value;
        }
        // Same rank, compare by suit
        return b.cards[0].suitValue - a.cards[0].suitValue;
      });

    // Tứ Quý (Four of a Kind) - AAAA
    if (counts[0].count === 4) {
      return {
        rank: this.handRanks.TU_QUY,
        name: 'Tứ Quý',
        cards: sortedCards,
        highCard: counts[0].cards[0],
        primaryCards: counts[0].cards
      };
    }

    // Sám Cô (Three of a Kind) - AAA, KKK, etc.
    if (counts[0].count === 3) {
      return {
        rank: this.handRanks.SAM_CO,
        name: 'Sám Cô',
        cards: sortedCards,
        highCard: counts[0].cards[0],
        primaryCards: counts[0].cards
      };
    }

    // Thú (Two Pair) - AA KK
    if (counts[0].count === 2 && counts[1] && counts[1].count === 2) {
      // Compare first pair, then second pair
      const firstPair = counts[0].cards.sort((a, b) => b.suitValue - a.suitValue);
      const secondPair = counts[1].cards.sort((a, b) => b.suitValue - a.suitValue);
      
      return {
        rank: this.handRanks.THU,
        name: 'Thú',
        cards: sortedCards,
        highCard: firstPair[0],
        primaryCards: [...firstPair, ...secondPair],
        pairs: [firstPair, secondPair]
      };
    }

    // Đôi (One Pair) - AA
    if (counts[0].count === 2) {
      const pairCards = counts[0].cards.sort((a, b) => b.suitValue - a.suitValue);
      return {
        rank: this.handRanks.DOI,
        name: 'Đôi',
        cards: sortedCards,
        highCard: pairCards[0],
        primaryCards: pairCards
      };
    }

    // Mậu Thầu (High Card) - A Bích is highest
    return {
      rank: this.handRanks.MAU_THAU,
      name: 'Mậu Thầu',
      cards: sortedCards,
      highCard: sortedCards[0],
      primaryCards: [sortedCards[0]]
    };
  }

  // Compare visible cards to determine who bets first
  compareVisibleHands(hand1, hand2) {
    // Compare hand rank first
    if (hand1.rank !== hand2.rank) {
      return hand1.rank - hand2.rank;
    }

    // Same rank, compare primary cards
    if (hand1.primaryCards && hand2.primaryCards) {
      for (let i = 0; i < Math.min(hand1.primaryCards.length, hand2.primaryCards.length); i++) {
        const card1 = hand1.primaryCards[i];
        const card2 = hand2.primaryCards[i];

        // Compare rank value
        if (card1.value !== card2.value) {
          return card1.value - card2.value;
        }

        // Compare suit (Bích > Tép > Rô > Cơ)
        if (card1.suitValue !== card2.suitValue) {
          return card1.suitValue - card2.suitValue;
        }
      }
    }

    // If still tied, compare all cards
    for (let i = 0; i < Math.min(hand1.cards.length, hand2.cards.length); i++) {
      if (hand1.cards[i].value !== hand2.cards[i].value) {
        return hand1.cards[i].value - hand2.cards[i].value;
      }
      if (hand1.cards[i].suitValue !== hand2.cards[i].suitValue) {
        return hand1.cards[i].suitValue - hand2.cards[i].suitValue;
      }
    }

    return 0; // Complete tie
  }

  // Evaluate full Xì Tố hand (all 7 cards at showdown)
  evaluateHand(cards) {
    const parsedCards = cards.map(c => this.parseCard(c));
    const sortedCards = parsedCards.sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return b.suitValue - a.suitValue;
    });
    
    const isFlush = parsedCards.every(c => c.suit === parsedCards[0].suit);
    const isStraight = this.checkStraight(sortedCards);
    
    // Count ranks
    const rankCounts = {};
    parsedCards.forEach(c => {
      rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
    });
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    
    // Check for special hands
    if (cards.length === 3 && isFlush && isStraight) {
      return { rank: this.handRanks.LIENG, name: 'Liêng', cards: sortedCards };
    }
    
    // Sanh Rồng (Royal Flush or A-K-Q-J-10 of same suit)
    if (isFlush && isStraight && sortedCards.length >= 5) {
      if (sortedCards[0].value === 14 && sortedCards[1].value === 13) {
        return { rank: this.handRanks.SANH_RONG, name: 'Sảnh Rồng', cards: sortedCards };
      }
    }
    
    // Tứ Quý (Four of a Kind)
    if (counts[0] === 4) {
      return { rank: this.handRanks.TU_QUY, name: 'Tứ Quý', cards: sortedCards };
    }
    
    // Cù Lũ (Full House)
    if (counts[0] === 3 && counts[1] >= 2) {
      return { rank: this.handRanks.CU_LU, name: 'Cù Lũ', cards: sortedCards };
    }
    
    // Thùng (Flush)
    if (isFlush) {
      return { rank: this.handRanks.THUNG, name: 'Thùng', cards: sortedCards };
    }
    
    // Sảnh (Straight)
    if (isStraight) {
      return { rank: this.handRanks.SANH, name: 'Sảnh', cards: sortedCards };
    }
    
    // Sám Cô (Three of a Kind)
    if (counts[0] === 3) {
      return { rank: this.handRanks.SAM_CO, name: 'Sám Cô', cards: sortedCards };
    }
    
    // Thú (Two Pair)
    if (counts[0] === 2 && counts[1] === 2) {
      return { rank: this.handRanks.THU, name: 'Thú', cards: sortedCards };
    }
    
    // Đôi (One Pair)
    if (counts[0] === 2) {
      return { rank: this.handRanks.DOI, name: 'Đôi', cards: sortedCards };
    }
    
    // Mậu Thầu (High Card)
    return { rank: this.handRanks.MAU_THAU, name: 'Mậu Thầu', cards: sortedCards };
  }

  checkStraight(sortedCards) {
    if (sortedCards.length < 3) return false;
    
    // Check normal straight
    let isStraight = true;
    for (let i = 0; i < sortedCards.length - 1; i++) {
      if (sortedCards[i].value - sortedCards[i + 1].value !== 1) {
        isStraight = false;
        break;
      }
    }
    
    if (isStraight) return true;
    
    // Check A-2-3... (Ace low straight)
    if (sortedCards[0].value === 14) {
      const tempCards = [...sortedCards];
      tempCards[0] = { ...tempCards[0], value: 1 };
      tempCards.sort((a, b) => b.value - a.value);
      
      isStraight = true;
      for (let i = 0; i < tempCards.length - 1; i++) {
        if (tempCards[i].value - tempCards[i + 1].value !== 1) {
          isStraight = false;
          break;
        }
      }
    }
    
    return isStraight;
  }

  compareHands(hand1, hand2) {
    if (hand1.rank !== hand2.rank) {
      return hand1.rank - hand2.rank;
    }
    
    // Same rank, compare high cards
    for (let i = 0; i < Math.min(hand1.cards.length, hand2.cards.length); i++) {
      if (hand1.cards[i].value !== hand2.cards[i].value) {
        return hand1.cards[i].value - hand2.cards[i].value;
      }
      // Tiebreaker by suit
      if (hand1.cards[i].suitValue !== hand2.cards[i].suitValue) {
        return hand1.cards[i].suitValue - hand2.cards[i].suitValue;
      }
    }
    
    return 0; // Tie
  }

  createDeck() {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const suits = ['H', 'D', 'C', 'S']; // Hearts (Cơ), Diamonds (Rô), Clubs (Tép), Spades (Bích)
    
    const deck = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push(rank + suit);
      }
    }
    
    return deck;
  }

  shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = XiToHandEvaluator;
