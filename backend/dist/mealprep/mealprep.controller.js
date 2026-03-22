"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MealPrepController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const mealprep_service_1 = require("./mealprep.service");
const mealprep_dto_1 = require("./mealprep.dto");
let MealPrepController = class MealPrepController {
    constructor(mealPrepService) {
        this.mealPrepService = mealPrepService;
    }
    async find(req) {
        return this.mealPrepService.findByUser(req.user.userId);
    }
    async update(req, dto) {
        return this.mealPrepService.update(req.user.userId, dto);
    }
};
exports.MealPrepController = MealPrepController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MealPrepController.prototype, "find", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, mealprep_dto_1.UpdateMealPrepDto]),
    __metadata("design:returntype", Promise)
], MealPrepController.prototype, "update", null);
exports.MealPrepController = MealPrepController = __decorate([
    (0, common_1.Controller)('mealprep-settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [mealprep_service_1.MealPrepService])
], MealPrepController);
//# sourceMappingURL=mealprep.controller.js.map