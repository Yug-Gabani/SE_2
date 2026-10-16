package com.group6.healthcare.clinic.service;

import com.group6.healthcare.clinic.dto.AppointmentResponse;
import com.group6.healthcare.clinic.dto.BookAppointmentRequest;
import com.group6.healthcare.clinic.entity.Appointment;
import com.group6.healthcare.clinic.entity.AppointmentStatus;
import com.group6.healthcare.clinic.entity.Doctor;
import com.group6.healthcare.clinic.entity.DoctorSlot;
import com.group6.healthcare.clinic.entity.TriageAssessment;
import com.group6.healthcare.clinic.entity.Urgency;
import com.group6.healthcare.clinic.repository.AppointmentRepository;
import com.group6.healthcare.clinic.repository.DoctorRepository;
import com.group6.healthcare.clinic.repository.DoctorSlotRepository;
import com.group6.healthcare.clinic.repository.TriageAssessmentRepository;
import com.group6.healthcare.common.exception.BusinessRuleException;
import com.group6.healthcare.common.exception.ConflictException;
import com.group6.healthcare.common.exception.ResourceNotFoundException;
import com.group6.healthcare.user.entity.User;
import com.group6.healthcare.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorSlotRepository slotRepository;
    private final TriageAssessmentRepository triageRepository;
    private final UserRepository userRepository;

    public AppointmentService(AppointmentRepository appointmentRepository,
                              DoctorRepository doctorRepository,
                              DoctorSlotRepository slotRepository,
                              TriageAssessmentRepository triageRepository,
                              UserRepository userRepository) {
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
        this.slotRepository = slotRepository;
        this.triageRepository = triageRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public AppointmentResponse book(UUID patientId, BookAppointmentRequest req) {
        Doctor doctor = doctorRepository.findById(req.doctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", req.doctorId()));

        // Pessimistic lock prevents two patients racing on the same slot row.
        DoctorSlot slot = slotRepository.findForUpdate(req.slotId())
                .orElseThrow(() -> new ResourceNotFoundException("Slot", req.slotId()));

        if (!slot.getDoctorId().equals(doctor.getId())) {
            throw new BusinessRuleException("Slot does not belong to the selected doctor");
        }
        if (slot.isBooked()) {
            throw new ConflictException("Slot already booked");
        }

        TriageAssessment assessment = null;
        if (req.assessmentId() != null) {
            assessment = triageRepository.findById(req.assessmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("TriageAssessment", req.assessmentId()));
            if (!assessment.getPatientId().equals(patientId)) {
                throw new BusinessRuleException("Triage assessment belongs to a different patient");
            }
        }

        slot.setBooked(true);
        slotRepository.save(slot);

        Urgency urgency = assessment != null ? assessment.getUrgency() : Urgency.ROUTINE;
        String complaint = assessment != null ? assessment.getChiefComplaint() : null;

        Appointment appt = Appointment.builder()
                .patientId(patientId)
                .doctorId(doctor.getId())
                .slotId(slot.getId())
                .assessmentId(assessment != null ? assessment.getId() : null)
                .consultationType(req.consultationType())
                .urgency(urgency)
                .status(AppointmentStatus.BOOKED)
                .chiefComplaint(complaint)
                .build();
        appt = appointmentRepository.save(appt);

        User patient = userRepository.findById(patientId).orElse(null);
        return toResponse(appt, doctor, slot, patient);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> listForPatient(UUID patientId) {
        List<Appointment> appointments = appointmentRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        return hydrate(appointments, patientId, null);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> listForDoctor(UUID doctorUserId) {
        return doctorRepository.findByUserId(doctorUserId)
                .map(doctor -> {
                    List<Appointment> appointments = appointmentRepository
                            .findByDoctorIdAndStatusInOrderByCreatedAtDesc(
                                    doctor.getId(),
                                    List.of(AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED));
                    return hydrate(appointments, null, doctor.getId());
                })
                .orElseGet(List::of);
    }

    @Transactional
    public AppointmentResponse cancel(UUID patientId, UUID appointmentId) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", appointmentId));
        if (!appt.getPatientId().equals(patientId)) {
            throw new BusinessRuleException("Appointment belongs to a different patient");
        }
        if (appt.getStatus() == AppointmentStatus.CANCELLED
                || appt.getStatus() == AppointmentStatus.COMPLETED) {
            throw new BusinessRuleException("Appointment cannot be cancelled from status " + appt.getStatus());
        }
        appt.setStatus(AppointmentStatus.CANCELLED);
        appointmentRepository.save(appt);

        // free the slot
        slotRepository.findById(appt.getSlotId()).ifPresent(s -> {
            s.setBooked(false);
            slotRepository.save(s);
        });

        Doctor doctor = doctorRepository.findById(appt.getDoctorId()).orElse(null);
        DoctorSlot slot = slotRepository.findById(appt.getSlotId()).orElse(null);
        User patient = userRepository.findById(patientId).orElse(null);
        return toResponse(appt, doctor, slot, patient);
    }

    @Transactional(readOnly = true)
    public AppointmentResponse get(UUID appointmentId, UUID patientId) {
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment", appointmentId));
        if (patientId != null && !appt.getPatientId().equals(patientId)) {
            throw new BusinessRuleException("Appointment belongs to a different patient");
        }
        Doctor doctor = doctorRepository.findById(appt.getDoctorId()).orElse(null);
        DoctorSlot slot = slotRepository.findById(appt.getSlotId()).orElse(null);
        User patient = userRepository.findById(appt.getPatientId()).orElse(null);
        return toResponse(appt, doctor, slot, patient);
    }

    private List<AppointmentResponse> hydrate(List<Appointment> appointments,
                                              UUID forcedPatientId,
                                              UUID forcedDoctorId) {
        if (appointments.isEmpty()) return List.of();

        List<UUID> doctorIds = appointments.stream().map(Appointment::getDoctorId).distinct().toList();
        Map<UUID, Doctor> doctorsById = doctorRepository.findAllById(doctorIds).stream()
                .collect(java.util.stream.Collectors.toMap(Doctor::getId, d -> d));

        List<UUID> slotIds = appointments.stream().map(Appointment::getSlotId).distinct().toList();
        Map<UUID, DoctorSlot> slotsById = slotRepository.findAllById(slotIds).stream()
                .collect(java.util.stream.Collectors.toMap(DoctorSlot::getId, s -> s));

        List<UUID> patientIds = appointments.stream().map(Appointment::getPatientId).distinct().toList();
        Map<UUID, User> patientsById = userRepository.findAllById(patientIds).stream()
                .collect(java.util.stream.Collectors.toMap(User::getId, u -> u));

        return appointments.stream()
                .map(a -> toResponse(
                        a,
                        doctorsById.get(a.getDoctorId()),
                        slotsById.get(a.getSlotId()),
                        patientsById.get(a.getPatientId())))
                .toList();
    }

    private AppointmentResponse toResponse(Appointment a, Doctor doctor, DoctorSlot slot, User patient) {
        return new AppointmentResponse(
                a.getId(),
                a.getPatientId(),
                patient != null ? patient.getFullName() : null,
                a.getDoctorId(),
                doctor != null ? doctor.getFullName() : null,
                doctor != null ? doctor.getSpecialty() : null,
                doctor != null ? doctor.getHospital() : null,
                doctor != null ? doctor.getAvatarUrl() : null,
                a.getSlotId(),
                slot != null ? slot.getSlotAt() : null,
                a.getAssessmentId(),
                a.getConsultationType(),
                a.getUrgency(),
                a.getStatus(),
                a.getChiefComplaint(),
                a.getNotes(),
                a.getCreatedAt(),
                a.getUpdatedAt()
        );
    }
}
