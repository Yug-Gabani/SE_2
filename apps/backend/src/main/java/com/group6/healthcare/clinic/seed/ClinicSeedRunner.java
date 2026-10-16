package com.group6.healthcare.clinic.seed;

import com.group6.healthcare.clinic.entity.Doctor;
import com.group6.healthcare.clinic.entity.DoctorSlot;
import com.group6.healthcare.clinic.repository.DoctorRepository;
import com.group6.healthcare.clinic.repository.DoctorSlotRepository;
import com.group6.healthcare.user.entity.Role;
import com.group6.healthcare.user.entity.User;
import com.group6.healthcare.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

/**
 * Seeds the clinical directory and a rolling 7-day slot inventory on startup. Guarded by the
 * `dev` profile so H2-backed tests stay empty. Safe to re-run: inserts are skipped when a doctor
 * with the same name already exists, and only future slots are regenerated for the window.
 */
@Configuration
@Profile("dev")
public class ClinicSeedRunner {

    private static final Logger log = LoggerFactory.getLogger(ClinicSeedRunner.class);

    /**
     * `loginEmail` is non-null for doctors we want to be loginable in the demo. The seeder creates
     * a matching DOCTOR user with password `Secret123` (dev only) and links `Doctor.user_id` to it.
     * The other doctors stay as directory-only entries so patients can book them even though no one
     * can sign in as them.
     */
    private static final List<SeedDoctor> DOCTORS = List.of(
            new SeedDoctor("Dr. Sarah Mitchell, MD", "Emergency & Internal Medicine",
                    "Metropolitan Medical Center",
                    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300",
                    new BigDecimal("4.90"), "doctor.mitchell@pulse.test"),
            new SeedDoctor("Dr. Robert Chen, FACC", "Cardiology",
                    "Heart & Vascular Institute",
                    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300",
                    new BigDecimal("4.95"), null),
            new SeedDoctor("Dr. Emily Vance, MD", "Pediatrics",
                    "St. Jude Children & Family Clinic",
                    "https://images.unsplash.com/photo-1594824813625-e517a26f6e16?auto=format&fit=crop&q=80&w=300",
                    new BigDecimal("4.88"), null),
            new SeedDoctor("Dr. Marcus Reynolds, DO", "Neurology",
                    "NeuroCare Regional Hospital",
                    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300",
                    new BigDecimal("4.82"), null),
            new SeedDoctor("Dr. Kavita Shah, MBBS", "General Medicine",
                    "Apollo Hospitals, Ahmedabad",
                    "https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=300",
                    new BigDecimal("4.86"), "doctor1@pulse.test"),
            new SeedDoctor("Dr. Suresh Rao, MD", "Dermatology",
                    "KD Hospital, Ahmedabad",
                    "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300",
                    new BigDecimal("4.78"), null)
    );

    private static final String DEMO_DOCTOR_PASSWORD = "Secret123";

    private static final List<LocalTime> DAILY_SLOT_TIMES = List.of(
            LocalTime.of(9, 30),
            LocalTime.of(10, 30),
            LocalTime.of(11, 30),
            LocalTime.of(14, 0),
            LocalTime.of(15, 30),
            LocalTime.of(17, 0)
    );

    @Bean
    ApplicationRunner clinicSeed(DoctorRepository doctorRepository,
                                 DoctorSlotRepository slotRepository,
                                 UserRepository userRepository,
                                 PasswordEncoder passwordEncoder) {
        return args -> seed(doctorRepository, slotRepository, userRepository, passwordEncoder);
    }

    @Transactional
    void seed(DoctorRepository doctorRepository,
              DoctorSlotRepository slotRepository,
              UserRepository userRepository,
              PasswordEncoder passwordEncoder) {
        int demoUsers = 0;
        for (SeedDoctor sd : DOCTORS) {
            // Ensure the login user exists first (for doctors that should be loginable).
            User doctorUser = null;
            if (sd.loginEmail() != null) {
                doctorUser = userRepository.findByEmailIgnoreCase(sd.loginEmail())
                        .orElseGet(() -> userRepository.save(User.builder()
                                .email(sd.loginEmail())
                                .passwordHash(passwordEncoder.encode(DEMO_DOCTOR_PASSWORD))
                                .fullName(sd.name())
                                .role(Role.DOCTOR)
                                .enabled(true)
                                .build()));
                demoUsers++;
            }

            final User linkedUser = doctorUser;
            Doctor doctor = doctorRepository.findAll().stream()
                    .filter(d -> d.getFullName().equalsIgnoreCase(sd.name()))
                    .findFirst()
                    .orElseGet(() -> doctorRepository.save(Doctor.builder()
                            .userId(linkedUser != null ? linkedUser.getId() : null)
                            .fullName(sd.name())
                            .specialty(sd.specialty())
                            .hospital(sd.hospital())
                            .avatarUrl(sd.avatarUrl())
                            .rating(sd.rating())
                            .bio(sd.name() + " specialises in " + sd.specialty() + ".")
                            .build()));

            // Backfill user_id on an existing doctor row that was seeded before this change landed.
            if (linkedUser != null && doctor.getUserId() == null) {
                doctor.setUserId(linkedUser.getId());
                doctorRepository.save(doctor);
            }

            seedSlotsFor(doctor, slotRepository);
        }
        log.info("Clinic seed completed: {} doctors ensured, {} demo doctor users ({}), slot window regenerated.",
                DOCTORS.size(), demoUsers, "password: " + DEMO_DOCTOR_PASSWORD);
    }

    private void seedSlotsFor(Doctor doctor, DoctorSlotRepository slotRepository) {
        OffsetDateTime now = OffsetDateTime.now();
        List<DoctorSlot> existing = slotRepository.findOpenSlots(doctor.getId(), now);
        if (existing.size() >= DAILY_SLOT_TIMES.size() * 3) {
            return; // already has a healthy forward window
        }
        LocalDate today = LocalDate.now();
        ZoneId zone = ZoneId.systemDefault();
        for (int day = 0; day < 7; day++) {
            LocalDate date = today.plusDays(day);
            for (LocalTime time : DAILY_SLOT_TIMES) {
                OffsetDateTime slotAt = date.atTime(time).atZone(zone).toOffsetDateTime();
                if (slotAt.isBefore(now)) continue;
                boolean exists = existing.stream().anyMatch(s -> s.getSlotAt().equals(slotAt));
                if (exists) continue;
                try {
                    slotRepository.save(DoctorSlot.builder()
                            .doctorId(doctor.getId())
                            .slotAt(slotAt)
                            .booked(false)
                            .build());
                } catch (Exception ignored) {
                    // unique(doctor_id, slot_at) may race with another startup — skip quietly
                }
            }
        }
    }

    private record SeedDoctor(String name, String specialty, String hospital,
                              String avatarUrl, BigDecimal rating, String loginEmail) {
    }
}
