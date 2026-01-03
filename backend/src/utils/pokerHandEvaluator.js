// Poker hand evaluator
class PokerHandEvaluator {
  constructor() {
    this.rankValues = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };

    this.handRanks = {
      'HIGH_CARD': 1,
      'PAIR': 2,
      'TWO_PAIR': 3,
      'THREE_OF_A_KIND': 4,
      'STRAIGHT': 5,
      'FLUSH': 6,
      'FULL_HOUSE': 7,
      'FOUR_OF_A_KIND': 8,
      'STRAIGHT_FLUSH': 9,
      'ROYAL_FLUSH': 10
    };
  }

  // Parse card string (e.g., "AS" = Ace of Spades)
  parseCard(card) {
    return {
      rank: card[0],
      suit: card[1],
      value: this.rankValues[card[0]]
    };
  }

  // Evaluate best 5-card hand from 7 cards
  evaluateHand(cards) {
    const parsedCards = cards.map(c => this.parseCard(c));
    
    // Get all possible 5-card combinations
    const combinations = this.getCombinations(parsedCards, 5);
    
    let bestHand = null;
    let bestRank = 0;

    for (const combo of combinations) {
      const hand = this.evaluateFiveCards(combo);
      if (hand.rank > bestRank) {
        bestRank = hand.rank;
        bestHand = hand;
      }
    }

    return bestHand;
  }

  // Get all combinations of size k from array
  getCombinations(arr, k) {
    if (k === 1) return arr.map(item => [item]);
    
    const combinations = [];
    for (let i = 0; i < arr.length - k + 1; i++) {
      const head = arr[i];
      const tailCombinations = this.getCombinations(arr.slice(i + 1), k - 1);
      for (const tail of tailCombinations) {
        combinations.push([head, ...tail]);
      }
    }
    return combinations;
  }

  // Evaluate exactly 5 cards
  evaluateFiveCards(cards) {
    const sortedCards = cards.sort((a, b) => b.value - a.value);
    
    // Check for flush
    const isFlush = cards.every(c => c.suit === cards[0].suit);
    
    // Check for straight
    const isStraight = this.checkStraight(sortedCards);
    
    // Count ranks
    const rankCounts = {};
    cards.forEach(c => {
      rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
    });
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    
    // Determine hand rank
    if (isFlush && isStraight) {
      if (sortedCards[0].value === 14) {
        return { rank: this.handRanks.ROYAL_FLUSH, name: 'Royal Flush', cards: sortedCards };
      }
      return { rank: this.handRanks.STRAIGHT_FLUSH, name: 'Straight Flush', cards: sortedCards };
    }
    
    if (counts[0] === 4) {
      return { rank: this.handRanks.FOUR_OF_A_KIND, name: 'Four of a Kind', cards: sortedCards };
    }
    
    if (counts[0] === 3 && counts[1] === 2) {
      return { rank: this.handRanks.FULL_HOUSE, name: 'Full House', cards: sortedCards };
    }
    
    if (isFlush) {
      return { rank: this.handRanks.FLUSH, name: 'Flush', cards: sortedCards };
    }
    
    if (isStraight) {
      return { rank: this.handRanks.STRAIGHT, name: 'Straight', cards: sortedCards };
    }
    
    if (counts[0] === 3) {
      return { rank: this.handRanks.THREE_OF_A_KIND, name: 'Three of a Kind', cards: sortedCards };
    }
    
    if (counts[0] === 2 && counts[1] === 2) {
      return { rank: this.handRanks.TWO_PAIR, name: 'Two Pair', cards: sortedCards };
    }
    
    if (counts[0] === 2) {
      return { rank: this.handRanks.PAIR, name: 'Pair', cards: sortedCards };
    }
    
    return { rank: this.handRanks.HIGH_CARD, name: 'High Card', cards: sortedCards };
  }

  checkStraight(sortedCards) {
    // Check normal straight
    let isStraight = true;
    for (let i = 0; i < sortedCards.length - 1; i++) {
      if (sortedCards[i].value - sortedCards[i + 1].value !== 1) {
        isStraight = false;
        break;
      }
    }
    
    if (isStraight) return true;
    
    // Check A-2-3-4-5 (wheel)
    if (sortedCards[0].value === 14 &&
        sortedCards[1].value === 5 &&
        sortedCards[2].value === 4 &&
        sortedCards[3].value === 3 &&
        sortedCards[4].value === 2) {
      return true;
    }
    
    return false;
  }

  // Compare two hands
  compareHands(hand1, hand2) {
    if (hand1.rank !== hand2.rank) {
      return hand1.rank - hand2.rank;
    }
    
    // Same rank, compare high cards
    for (let i = 0; i < hand1.cards.length; i++) {
      if (hand1.cards[i].value !== hand2.cards[i].value) {
        return hand1.cards[i].value - hand2.cards[i].value;
      }
    }
    
    return 0; // Tie
  }

  // Create a standard 52-card deck
  createDeck() {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const suits = ['H', 'D', 'C', 'S']; // Hearts, Diamonds, Clubs, Spades
    
    const deck = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push(rank + suit);
      }
    }
    
    return deck;
  }

  // Shuffle deck
  shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = PokerHandEvaluator;
