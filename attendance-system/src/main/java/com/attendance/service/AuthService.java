package com.attendance.service;

import com.attendance.dto.AuthResponse;
import com.attendance.dto.LoginRequest;
import com.attendance.dto.RefreshTokenRequest;
import com.attendance.entity.Employee;
import com.attendance.entity.RefreshToken;
import com.attendance.repository.EmployeeRepository;
import com.attendance.repository.RefreshTokenRepository;
import com.attendance.security.JwtTokenProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

@Service
public class AuthService {

    private final EmployeeRepository employeeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final StringRedisTemplate redisTemplate;

    public AuthService(EmployeeRepository employeeRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       JwtTokenProvider jwtTokenProvider,
                       PasswordEncoder passwordEncoder,
                       StringRedisTemplate redisTemplate) {
        this.employeeRepository = employeeRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
        this.redisTemplate = redisTemplate;
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress, String userAgent) {
        Employee employee = employeeRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("用户名或密码错误"));

        if (!passwordEncoder.matches(request.getPassword(), employee.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }

        if (!"ACTIVE".equals(employee.getStatus())) {
            throw new RuntimeException("账号已被禁用");
        }

        String accessToken = jwtTokenProvider.generateAccessToken(
                employee.getId(), employee.getUsername(), employee.getRole());
        String refreshToken = jwtTokenProvider.generateRefreshToken(employee.getId());

        // 保存refresh token到数据库
        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .employeeId(employee.getId())
                .token(refreshToken)
                .expiryDate(LocalDateTime.now().plusDays(7))
                .ipAddress(ipAddress)
                .userAgent(userAgent)
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshTokenEntity);

        // 保存会话到Redis
        String sessionKey = "session:" + employee.getId() + ":" + accessToken.substring(0, 20);
        redisTemplate.opsForValue().set(sessionKey, employee.getId().toString(), 
                Duration.ofMillis(jwtTokenProvider.getExpirationFromToken(accessToken).getTime() - System.currentTimeMillis()));

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(900L)  // 15分钟
                .employee(AuthResponse.EmployeeDTO.builder()
                        .id(employee.getId())
                        .username(employee.getUsername())
                        .realName(employee.getRealName())
                        .role(employee.getRole())
                        .employeeType(employee.getEmployeeType())
                        .build())
                .build();
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request, String ipAddress) {
        String refreshToken = request.getRefreshToken();

        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new RuntimeException("Refresh token无效或已过期");
        }

        String tokenType = jwtTokenProvider.getTokenType(refreshToken);
        if (!"refresh".equals(tokenType)) {
            throw new RuntimeException("无效的token类型");
        }

        RefreshToken storedToken = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new RuntimeException("Refresh token不存在"));

        if (storedToken.getRevoked()) {
            throw new RuntimeException("Refresh token已被撤销");
        }

        if (storedToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Refresh token已过期");
        }

        // 撤销旧的refresh token
        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        // 生成新的access token
        Long employeeId = jwtTokenProvider.getEmployeeIdFromToken(refreshToken);
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));

        String newAccessToken = jwtTokenProvider.generateAccessToken(
                employee.getId(), employee.getUsername(), employee.getRole());

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(null)  // 只返回新的access token
                .tokenType("Bearer")
                .expiresIn(900L)
                .employee(AuthResponse.EmployeeDTO.builder()
                        .id(employee.getId())
                        .username(employee.getUsername())
                        .realName(employee.getRealName())
                        .role(employee.getRole())
                        .employeeType(employee.getEmployeeType())
                        .build())
                .build();
    }

    @Transactional
    public void logout(String accessToken, String refreshToken) {
        // 将access token加入黑名单
        if (accessToken != null && jwtTokenProvider.validateToken(accessToken)) {
            long expiration = jwtTokenProvider.getExpirationFromToken(accessToken).getTime() - System.currentTimeMillis();
            if (expiration > 0) {
                String blacklistKey = "token:blacklist:" + accessToken;
                redisTemplate.opsForValue().set(blacklistKey, "1", expiration, TimeUnit.MILLISECONDS);
            }
        }

        // 撤销refresh token
        if (refreshToken != null) {
            refreshTokenRepository.revokeByToken(refreshToken);
        }
    }
}
