package com.group6.healthcare.clinic.service;

import com.group6.healthcare.clinic.dto.DoctorResponse;
import com.group6.healthcare.clinic.dto.SlotResponse;
import com.group6.healthcare.clinic.entity.Doctor;
import com.group6.healthcare.clinic.entity.DoctorSlot;
import com.group6.healthcare.clinic.repository.DoctorRepository;
import com.group6.healthcare.clinic.repository.DoctorSlotRepository;
import com.group6.healthcare.common.exception.ResourceNotFoundException;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final DoctorSlotRepository slotRepository;

    public DoctorService(DoctorRepository doctorRepository, DoctorSlotRepository slotRepository) {
        this.doctorRepository = doctorRepository;
        this.slotRepository = slotRepository;
    }

    @Transactional(readOnly = true)
    public List<DoctorResponse> listDoctors(String specialtyQuery, UUID hospitalId) {
        String spec = (specialtyQuery == null || specialtyQuery.isBlank()) ? null : specialtyQuery;
        List<Doctor> doctors = (spec == null && hospitalId == null)
                ? doctorRepository.findApprovedOrderByRatingDescFullNameAsc()
                : doctorRepository.searchByFilters(spec, hospitalId);
        OffsetDateTime now = OffsetDateTime.now();
        return doctors.stream().map(d -> toResponse(d, now, 3)).toList();
    }

    /** Backwards-compatible single-arg overload. */
    @Transactional(readOnly = true)
    public List<DoctorResponse> listDoctors(String specialtyQuery) {
        return listDoctors(specialtyQuery, null);
    }

    @Transactional(readOnly = true)
    public DoctorResponse getDoctor(UUID doctorId) {
        Doctor d = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", doctorId));
        return toResponse(d, OffsetDateTime.now(), 8);
    }

    @Transactional(readOnly = true)
    public List<SlotResponse> listOpenSlots(UUID doctorId) {
        if (!doctorRepository.existsById(doctorId)) {
            throw new ResourceNotFoundException("Doctor", doctorId);
        }
        return slotRepository.findOpenSlots(doctorId, OffsetDateTime.now()).stream()
                .map(s -> new SlotResponse(s.getId(), s.getDoctorId(), s.getSlotAt(), s.isBooked()))
                .toList();
    }

    private DoctorResponse toResponse(Doctor d, OffsetDateTime from, int limit) {
        List<DoctorSlot> openSlots = slotRepository.findOpenSlotsLimited(
                d.getId(), from, PageRequest.of(0, Math.max(1, limit)));
        List<DoctorResponse.SlotSummary> previews = openSlots.stream()
                .map(s -> new DoctorResponse.SlotSummary(s.getId(), s.getSlotAt()))
                .toList();
        return new DoctorResponse(
                d.getId(),
                d.getFullName(),
                d.getSpecialty(),
                d.getHospital(),
                d.getHospitalId(),
                d.getAvatarUrl(),
                d.getRating(),
                d.getReviewCount() != null ? d.getReviewCount() : 0,
                d.getBio(),
                previews,
                previews.size()
        );
    }
}
