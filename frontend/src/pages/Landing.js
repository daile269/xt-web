import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Create floating particles
    createParticles();
  }, []);

  const createParticles = () => {
    const particlesContainer = document.querySelector('.particles');
    if (!particlesContainer) return;

    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 10 + 's';
      particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
      particlesContainer.appendChild(particle);
    }
  };

  const handlePlayNow = () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/lobby');
    } else {
      navigate('/login');
    }
  };

  const handleFreeChips = () => {
    toast.info('Nhận chip miễn phí mỗi ngày!');
    navigate('/login');
  };

  return (
    <div className="landing-page">
      <div className="particles"></div>

      {/* Player Info (if logged in) */}
      <div className="player-info-header">
        <img 
          src="https://i.pravatar.cc/150?img=1" 
          alt="Player" 
          className="player-avatar-small"
        />
        <div className="player-chips-info">
          <div className="chip-icon">💲</div>
          <div className="chip-amount">2,000</div>
        </div>
      </div>

      {/* Main Logo */}
      <div className="main-logo">
        <div className="logo-container">
          <div className="logo-neon-border"></div>
          <div className="logo-badge-main">
            <div className="logo-suits-main">
              <span className="suit-icon">♠</span>
              <span className="suit-icon">♥</span>
              <span className="suit-icon">♣</span>
              <span className="suit-icon">♦</span>
            </div>
            <div className="logo-text-main">XÌ TỐ</div>
          </div>
        </div>
      </div>

      {/* 3D Poker Table */}
      <div className="poker-table-3d">
        <div className="table-3d-inner">
          <div className="table-surface">
            {/* Cards on table */}
            <div className="table-cards">
              <div className="table-card red">10<br/>♥</div>
              <div className="table-card red">J<br/>♦</div>
              <div className="table-card red">Q<br/>♥</div>
              <div className="table-card black">K<br/>♠</div>
              <div className="table-card red">J<br/>♥</div>
            </div>

            {/* Chip stacks */}
            <div className="chip-stack left">
              <div className="chip"></div>
              <div className="chip"></div>
              <div className="chip"></div>
            </div>
            <div className="chip-stack right">
              <div className="chip"></div>
              <div className="chip"></div>
              <div className="chip"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Play Button */}
      <div className="play-button-container">
        <button className="play-button" onClick={handlePlayNow}>
          <div className="button-glow"></div>
          <div className="button-main">
            <div className="button-icon">♠♥</div>
            <div className="button-text">CHƠI NGAY</div>
          </div>
        </button>
      </div>

      {/* Free Chips Button */}
      <button className="free-chips-button" onClick={handleFreeChips}>
        Chip miễn phí
      </button>
    </div>
  );
};

export default Landing;
