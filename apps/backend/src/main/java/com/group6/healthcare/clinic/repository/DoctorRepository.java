package com.group6.healthcare.clinic.repository;

import com.group6.healthcare.clinic.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DoctorRepository extends JpaRepository<Doctor, UUID> {

    @Query("SELECT d FROM Doctor d WHERE LOWER(d.specialty) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "ORDER BY d.rating DESC, d.fullName ASC")
    List<Doctor> searchBySpecialty(@Param("q") String specialtyQuery);

    List<Doctor> findAllByOrderByRatingDescFullNameAsc();

    Optional<Doctor> findByUserId(UUID userId);
}
