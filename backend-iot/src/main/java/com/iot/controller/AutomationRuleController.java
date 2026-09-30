package com.iot.controller;

import com.iot.model.AutomationRule;
import com.iot.service.AutomationRuleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/iot/v1/automations")
@CrossOrigin(origins = "*")
public class AutomationRuleController {
    private final AutomationRuleService service;

    public AutomationRuleController(AutomationRuleService service) {
        this.service = service;
    }

    @GetMapping
    public List<AutomationRule> list() {
        return service.listRules();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody AutomationRule rule) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(service.saveRule(rule));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody AutomationRule rule) {
        rule.setId(id);
        try {
            return ResponseEntity.ok(service.saveRule(rule));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        return service.deleteRule(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
