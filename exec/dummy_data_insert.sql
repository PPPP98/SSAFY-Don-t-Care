-- DontCare Project Dummy Data SQL Dump
-- Generated for Django models that actually store data in PostgreSQL
-- Date: 2025-09-26
-- Database: PostgreSQL
--
-- 포함된 모델:
-- 1. accounts.User - 사용자 정보 (email, name, password)
--
-- 제외된 모델:
-- - stocks 앱: DB 저장 없이 캐시만 사용
-- - crawlings 앱: 실시간 크롤링으로 DB 저장 없음
-- - JWT blacklist: rest_framework_simplejwt.token_blacklist로 자동 관리

-- ========================================
-- User 테이블 더미 데이터 (accounts_user)
-- ========================================

-- 테스트 사용자 10명 생성 (AbstractUser 기반)
INSERT INTO accounts_user (email, name, password, is_active, is_staff, is_superuser, date_joined, last_login, first_name, last_name) VALUES
('user1@dontcare.com', '김영수', 'pbkdf2_sha256$600000$randomsalt1$hashedpassword1', true, false, false, NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day', '', ''),
('user2@dontcare.com', '이민지', 'pbkdf2_sha256$600000$randomsalt2$hashedpassword2', true, false, false, NOW() - INTERVAL '25 days', NOW() - INTERVAL '2 days', '', ''),
('user3@dontcare.com', '박진우', 'pbkdf2_sha256$600000$randomsalt3$hashedpassword3', true, false, false, NOW() - INTERVAL '20 days', NOW() - INTERVAL '3 days', '', ''),
('user4@dontcare.com', '최수연', 'pbkdf2_sha256$600000$randomsalt4$hashedpassword4', true, false, false, NOW() - INTERVAL '18 days', NOW() - INTERVAL '4 days', '', ''),
('user5@dontcare.com', '정대현', 'pbkdf2_sha256$600000$randomsalt5$hashedpassword5', true, false, false, NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days', '', ''),
('user6@dontcare.com', '한예원', 'pbkdf2_sha256$600000$randomsalt6$hashedpassword6', true, false, false, NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 hour', '', ''),
('user7@dontcare.com', '조성민', 'pbkdf2_sha256$600000$randomsalt7$hashedpassword7', true, false, false, NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 hours', '', ''),
('user8@dontcare.com', '장혜정', 'pbkdf2_sha256$600000$randomsalt8$hashedpassword8', true, false, false, NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 hours', '', ''),
('user9@dontcare.com', '윤태웅', 'pbkdf2_sha256$600000$randomsalt9$hashedpassword9', true, false, false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 hours', '', ''),
('user10@dontcare.com', '강미경', 'pbkdf2_sha256$600000$randomsalt10$hashedpassword10', true, false, false, NOW() - INTERVAL '3 days', NOW() - INTERVAL '5 hours', '', '');





-- ========================================
-- 데이터 검증 쿼리 (참고용)
-- ========================================

/*
-- 생성된 데이터 확인용 쿼리들

-- 사용자 수 확인
SELECT COUNT(*) as user_count FROM accounts_user WHERE email LIKE '%@dontcare.com';

-- JWT 토큰 blacklist 확인 (rest_framework_simplejwt.token_blacklist 앱에서 자동 관리)
SELECT COUNT(*) as blacklisted_tokens FROM token_blacklist_blacklistedtoken;


*/

-- ========================================
-- 생성 완료
-- ========================================

-- 총 생성된 레코드:
-- - accounts_user: 10명 (AbstractUser 기반 커스텀 유저)
--
-- 제외된 앱들:
-- - stocks: DB 저장 없이 캐시만 사용  
-- - crawlings: 실시간 크롤링으로 DB 저장 없음
-- - JWT blacklist: rest_framework_simplejwt.token_blacklist 앱에서 자동 관리
--
-- JWT blacklist 기능:
-- - BLACKLIST_AFTER_ROTATION: True (토큰 rotate 시 기존 토큰 자동 blacklist)
-- - ROTATE_REFRESH_TOKENS: True (refresh 시 새 토큰 발급)
-- - 로그아웃 시 TokenBlacklistView를 통해 수동 blacklist 가능
-- 
-- 모든 데이터는 PostgreSQL 호환 형식이며 외래키 제약조건을 만족합니다.